"use client";

import "cesium/Build/Cesium/Widgets/widgets.css";
import * as Cesium from "cesium";
import { useEffect, useMemo, useRef } from "react";
import { CesiumComponentRef, Entity, LabelGraphics, PointGraphics, PolylineGraphics, Viewer } from "resium";
import { colorForCategory } from "@/lib/categoryColors";
import type { OrbitPoint, SatelliteSummary } from "@/lib/api";

if (typeof window !== "undefined") {
  window.CESIUM_BASE_URL = "/cesium/";

  const ionToken = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN;
  if (ionToken) {
    Cesium.Ion.defaultAccessToken = ionToken;
  }
}

// Points shrink as the camera pulls back so a full constellation doesn't turn into a solid ring.
const POINT_SCALE_BY_DISTANCE = new Cesium.NearFarScalar(1.0e3, 1.4, 4.0e7, 0.5);
const LABEL_PIXEL_OFFSET = new Cesium.Cartesian2(0, -18);
const LABEL_BACKGROUND_COLOR = Cesium.Color.BLACK.withAlpha(0.5);
const EARTH_RADIUS_KM = 6371;

// colorForCategory returns a CSS hex string (shared with plain DOM components);
// parsing that into a Cesium.Color is real per-call work, so cache the handful
// of category colors once instead of re-parsing for every satellite every poll.
const cesiumColorCache = new Map<string, Cesium.Color>();
function getCesiumColor(category: string): Cesium.Color {
  let color = cesiumColorCache.get(category);
  if (!color) {
    color = Cesium.Color.fromCssColorString(colorForCategory(category));
    cesiumColorCache.set(category, color);
  }
  return color;
}

function createPositionProperty(): Cesium.SampledPositionProperty {
  const property = new Cesium.SampledPositionProperty();
  // Poll samples land every 10s; hold position steady if a poll is ever late
  // rather than extrapolating a guess past the last known sample.
  property.forwardExtrapolationType = Cesium.ExtrapolationType.HOLD;
  property.backwardExtrapolationType = Cesium.ExtrapolationType.HOLD;
  property.setInterpolationOptions({
    interpolationDegree: 1,
    interpolationAlgorithm: Cesium.LinearApproximation,
  });
  return property;
}

type GlobeProps = {
  satellites: SatelliteSummary[];
  selectedId: number | null;
  trackedId: number | null;
  orbitPoints: OrbitPoint[];
  orbitCategory: string | null;
  onSelect: (noradId: number | null) => void;
};

export default function Globe({
  satellites,
  selectedId,
  trackedId,
  orbitPoints,
  orbitCategory,
  onSelect,
}: GlobeProps) {
  const viewerRef = useRef<CesiumComponentRef<Cesium.Viewer>>(null);
  // Which trackedId we've already flown the camera in for. Deliberately not
  // derived from viewer.trackedEntity — Cesium can reset that pointer on its
  // own (e.g. around the entity's position property being briefly undefined
  // during the static-to-smoothed handoff below), and comparing against it
  // caused the initial fly-in to silently re-fire and fight manual panning.
  // This ref is the only thing gating the flyTo call, so it fires exactly
  // once per Track click no matter what Cesium does internally afterward.
  const flownToTrackedIdRef = useRef<number | null>(null);

  useEffect(() => {
    const viewer = viewerRef.current?.cesiumElement;
    if (!viewer || viewer.isDestroyed()) return;

    viewer.scene.globe.enableLighting = true;
    viewer.scene.globe.dynamicAtmosphereLighting = true;

    // Keep the simulation clock glued to real wall-clock time (no timeline UI
    // is shown, but SampledPositionProperty still needs a ticking clock to
    // interpolate against) so the selected/tracked satellite glides smoothly.
    viewer.clock.shouldAnimate = true;
    viewer.clock.clockStep = Cesium.ClockStep.SYSTEM_CLOCK;
  }, []);

  useEffect(() => {
    const viewer = viewerRef.current?.cesiumElement;
    if (!viewer || viewer.isDestroyed()) return;

    if (trackedId == null) {
      flownToTrackedIdRef.current = null;
      if (viewer.trackedEntity !== undefined) {
        // eslint-disable-next-line react-hooks/immutability -- Cesium's own imperative camera-follow API
        viewer.trackedEntity = undefined;
      }
      return;
    }

    const entity = viewer.entities.getById(String(trackedId));
    if (!entity) return;

    // Keep Cesium's own follow-cam pointed at the right entity every time
    // this effect re-runs (harmless if already correct), but the fly-in
    // animation below is gated on flownToTrackedIdRef alone, so it never
    // repeats for the same trackedId regardless of what viewer.trackedEntity
    // does on its own.
    if (viewer.trackedEntity !== entity) {
      viewer.trackedEntity = entity;
    }

    if (flownToTrackedIdRef.current === trackedId) return;
    flownToTrackedIdRef.current = trackedId;

    // Start far enough back to see the whole orbit ring, not just the dot.
    // The ring's radius is roughly Earth's radius plus altitude, so scale
    // off that rather than altitude alone — a purely altitude-based distance
    // put the camera closer than the ring itself for low orbits like the ISS.
    //
    // Setting this via camera.lookAt() right after trackedEntity gets
    // silently overridden: Cesium runs its own default "snap to entity"
    // setup on the next frame once tracking starts, which stomps on
    // whatever offset was set synchronously beforehand. flyTo's offset is
    // what actually persists as the ongoing tracked distance afterward.
    const satellite = satellites.find((s) => s.noradId === trackedId);
    const orbitRadiusKm = EARTH_RADIUS_KM + (satellite?.altitudeKm ?? 500);
    const rangeMeters = orbitRadiusKm * 2.5 * 1000;
    viewer.flyTo(entity, {
      offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-30), rangeMeters),
      duration: 1.5,
    });
  }, [trackedId, satellites]);

  // Smooth interpolation only makes a visible difference for whichever
  // satellite is selected or tracked (that's the one the camera/eye is on) —
  // and it isn't free: Cesium re-evaluates a SampledPositionProperty every
  // frame, for every entity that has one. Doing that for an entire loaded
  // group (dozens to hundreds of satellites) noticeably slowed down general
  // rendering, including how quickly newly-loaded dots appeared. So only the
  // selected/tracked entity gets a SampledPositionProperty here; everything
  // else uses a plain position prop below, which is effectively free.
  useEffect(() => {
    const viewer = viewerRef.current?.cesiumElement;
    if (!viewer || viewer.isDestroyed()) return;

    const smoothIds = new Set([selectedId, trackedId].filter((id): id is number => id != null));
    if (smoothIds.size === 0) return;

    const now = Cesium.JulianDate.now();
    for (const sat of satellites) {
      if (!smoothIds.has(sat.noradId)) continue;

      const entity = viewer.entities.getById(String(sat.noradId));
      if (!entity) continue;

      let property: Cesium.SampledPositionProperty;
      if (entity.position instanceof Cesium.SampledPositionProperty) {
        property = entity.position;
      } else {
        property = createPositionProperty();
        entity.position = property;
      }
      property.addSample(now, Cesium.Cartesian3.fromDegrees(sat.longitude, sat.latitude, sat.altitudeKm * 1000));
    }
  }, [satellites, selectedId, trackedId]);

  const orbitPositions = useMemo(
    () =>
      orbitPoints.map((p) => Cesium.Cartesian3.fromDegrees(p.longitude, p.latitude, p.altitudeKm * 1000)),
    [orbitPoints],
  );

  return (
    <Viewer
      ref={viewerRef}
      full
      timeline={false}
      animation={false}
      baseLayerPicker={false}
      geocoder={false}
      homeButton={false}
      sceneModePicker={false}
      navigationHelpButton={false}
      infoBox={false}
      fullscreenButton={false}
      selectionIndicator={false}
      onSelectedEntityChange={(entity) => onSelect(entity ? Number(entity.id) : null)}
    >
      {orbitPositions.length > 1 && (
        <Entity>
          <PolylineGraphics
            positions={orbitPositions}
            width={2}
            arcType={Cesium.ArcType.NONE}
            material={getCesiumColor(orbitCategory ?? "").withAlpha(0.6)}
          />
        </Entity>
      )}

      {satellites.map((sat) => {
        const isSelected = sat.noradId === selectedId;
        const isSmoothed = isSelected || sat.noradId === trackedId;
        const color = getCesiumColor(sat.category);
        return (
          <Entity
            key={sat.noradId}
            id={String(sat.noradId)}
            name={sat.name}
            // Smoothed entities have their position managed imperatively by
            // the effect above (a SampledPositionProperty); everything else
            // gets a plain, cheap, synchronously-applied position here.
            position={
              isSmoothed
                ? undefined
                : Cesium.Cartesian3.fromDegrees(sat.longitude, sat.latitude, sat.altitudeKm * 1000)
            }
          >
            <PointGraphics
              pixelSize={isSelected ? 14 : 8}
              color={color}
              outlineColor={isSelected ? Cesium.Color.WHITE : Cesium.Color.BLACK}
              outlineWidth={isSelected ? 2 : 1}
              scaleByDistance={POINT_SCALE_BY_DISTANCE}
            />
            <LabelGraphics
              text={sat.name}
              font="12px sans-serif"
              fillColor={Cesium.Color.WHITE}
              style={Cesium.LabelStyle.FILL_AND_OUTLINE}
              outlineWidth={2}
              pixelOffset={LABEL_PIXEL_OFFSET}
              showBackground
              backgroundColor={LABEL_BACKGROUND_COLOR}
              show={isSelected}
            />
          </Entity>
        );
      })}
    </Viewer>
  );
}
