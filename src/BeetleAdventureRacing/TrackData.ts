
import { vec3, vec4 } from "gl-matrix";
import { divideByW } from "../Camera.js";
import { Color, White, colorFromHSL, colorNewFromRGBA } from "../Color.js";
import { drawWorldSpaceAABB, drawWorldSpacePoint, drawWorldSpaceText, drawWorldSpaceVector, getDebugOverlayCanvas2D } from "../DebugJunk.js";
import { AABB } from "../Geometry.js";
import { Vec3UnitX, Vec3UnitY, Vec3UnitZ } from "../MathHelpers.js";
import { DebugDraw } from "../gfx/helpers/DebugDraw.js";
import { GfxDevice } from "../gfx/platform/GfxPlatform.js";
import { GfxRenderInstManager } from "../gfx/render/GfxRenderInstManager.js";
import { ViewerRenderInput } from "../viewer.js";
import { Filesystem } from "./Filesystem.js";
import { UVTT } from "./ParsedFiles/UVTT.js";

// If the player resets when their progress is within this range, they will be reset as if their progress was at the end of the range
class SpecialResetZone {
    constructor(
        public progressMin: number,
        public progressMax: number) {
    }
}

// If the player is within the defined region AND their progress is within the defined range,
// the game will search for their current checkpoint starting from newProgress
class ProgressFixZone {
    constructor(
        public x: number,
        public y: number,
        public squareHalfSize: number,
        public progressMin: number,
        public progressMax: number,
        public newProgress: number
    ) {
    }
}

// This data can't really be loaded from files since it's just generated/loaded as part of the course's initializer
const courseInfoBySceneIndex: Record<number, { uvttIndex: number, specialResetZones: SpecialResetZone[], progressFixZones: ProgressFixZone[] }> = {
    // Coventry Cove
    0x5: {
        uvttIndex: 3,
        specialResetZones: [
            new SpecialResetZone(15193, 15263),
            new SpecialResetZone(8559, 8629),
            new SpecialResetZone(1925, 1995),
            new SpecialResetZone(0, 10),
        ],
        progressFixZones: []
    },
    // Mount Mayhem
    0x7: {
        uvttIndex: 0,
        specialResetZones: [],
        progressFixZones: [
            new ProgressFixZone(-810, 508, 50, 17450, 17850, 17942),
            new ProgressFixZone(-849, 165, 35, 18218, 18318, 19233),
            new ProgressFixZone(-810, 508, 50, 10525, 10925, 11017),
            new ProgressFixZone(-849, 165, 35, 11293, 11393, 12308),
            new ProgressFixZone(-810, 508, 50, 3600, 4000, 4092),
            new ProgressFixZone(-849, 165, 35, 4368, 4468, 5383),
        ]
    },
    // Inferno Isle
    0x9: {
        uvttIndex: 5,
        specialResetZones: [
            new SpecialResetZone(23530, 23580),
            new SpecialResetZone(23300, 23400),
            new SpecialResetZone(21561, 21591),
            new SpecialResetZone(24446, 24501),
            new SpecialResetZone(13278, 13308),
            new SpecialResetZone(16163, 16218),
            new SpecialResetZone(4995, 5025),
            new SpecialResetZone(7880, 7935),
        ],
        progressFixZones: []
    },
    // Sunset Sands
    0x8: {
        uvttIndex: 2,
        specialResetZones: [
            new SpecialResetZone(1313, 1440),
        ],
        progressFixZones: [
            new ProgressFixZone(-817, 695, 100, 20556, 22056, 22390),
            new ProgressFixZone(-1143, 475, 60, 20556, 21246, 21837),
            new ProgressFixZone(-1094, 799, 100, 21456, 21656, 21867),
            new ProgressFixZone(-467, 509, 50, 19619, 19819, 20113),
            new ProgressFixZone(480, 566, 100, 23576, 23776, 23906),
            new ProgressFixZone(-964, 716, 70, 21912, 21992, 22329),
            new ProgressFixZone(-454, 511, 50, 19764, 19844, 20186),
            new ProgressFixZone(-445, 514, 55, 18706, 18906, 19703),
            new ProgressFixZone(-817, 695, 100, 12533, 14033, 14367),
            new ProgressFixZone(-1143, 475, 60, 12533, 13223, 13814),
            new ProgressFixZone(-1094, 799, 100, 13433, 13633, 13844),
            new ProgressFixZone(-467, 509, 50, 11596, 11796, 12090),
            new ProgressFixZone(480, 566, 100, 15553, 15753, 15883),
            new ProgressFixZone(-964, 716, 70, 13889, 13969, 14306),
            new ProgressFixZone(-454, 511, 50, 11741, 11821, 12163),
            new ProgressFixZone(-445, 514, 55, 10683, 10883, 11680),
            new ProgressFixZone(-817, 695, 100, 4510, 6010, 6344),
            new ProgressFixZone(-1143, 475, 60, 4510, 5200, 5791),
            new ProgressFixZone(-1094, 799, 100, 5410, 5610, 5821),
            new ProgressFixZone(-467, 509, 50, 3573, 3773, 4067),
            new ProgressFixZone(480, 566, 100, 7530, 7730, 7860),
            new ProgressFixZone(-964, 716, 70, 5866, 5946, 6283),
            new ProgressFixZone(-454, 511, 50, 3718, 3798, 4140),
            new ProgressFixZone(-445, 514, 55, 2660, 2860, 3657),
        ]
    },
    // Metro Madness
    0xA: {
        uvttIndex: 1,
        specialResetZones: [],
        progressFixZones: [
            new ProgressFixZone(-280, -18, 30, 600, 900, 1843),
            new ProgressFixZone(-154.60000610351563, -718.2000122070313, 30, 24024, 24084, 24403),
            new ProgressFixZone(145, -700, 80, 23944, 24144, 24403),
            new ProgressFixZone(298, -591, 60, 22139, 22339, 22573),
            new ProgressFixZone(-371, 658, 100, 17610, 18210, 19290),
            new ProgressFixZone(-645.9000244140625, 458.70001220703125, 40, 17928, 18128, 18610),
            new ProgressFixZone(-617.5, 192.5, 20, 17410, 18410, 18610),
            new ProgressFixZone(-757.5, 454.5, 50, 17410, 18410, 18710),
            new ProgressFixZone(-154.60000610351563, -718.2000122070313, 30, 15719, 15779, 16098),
            new ProgressFixZone(145, -700, 80, 15639, 15839, 16098),
            new ProgressFixZone(298, -591, 60, 13834, 14034, 14268),
            new ProgressFixZone(-371, 658, 100, 9305, 9905, 10985),
            new ProgressFixZone(-645.9000244140625, 458.70001220703125, 40, 9623, 9823, 10305),
            new ProgressFixZone(-617.5, 192.5, 20, 9105, 10105, 10305),
            new ProgressFixZone(-757.5, 454.5, 50, 9105, 10105, 10405),
            new ProgressFixZone(-154.60000610351563, -718.2000122070313, 30, 7414, 7474, 7793),
            new ProgressFixZone(145, -700, 80, 7334, 7534, 7793),
            new ProgressFixZone(298, -591, 60, 5529, 5729, 5963),
            new ProgressFixZone(-371, 658, 100, 1000, 1600, 2680),
            new ProgressFixZone(-645.9000244140625, 458.70001220703125, 40, 1318, 1518, 2000),
            new ProgressFixZone(-617.5, 192.5, 20, 800, 1800, 2000),
            new ProgressFixZone(-757.5, 454.5, 50, 800, 1800, 2100),
        ]
    },
    // Metro Madness
    0x6: {
        uvttIndex: 4,
        specialResetZones: [],
        progressFixZones: [
            new ProgressFixZone(511.3999938964844, -66.69999694824219, 50, 10845, 11545, 11645),
            new ProgressFixZone(511.3999938964844, -66.69999694824219, 50, 5600, 6300, 6400),
        ]
    }
}

export interface CourseTrackData {
    uvtt: UVTT
    specialResetZones: SpecialResetZone[];
    progressFixZones: ProgressFixZone[];
}

export function getTrackData(sceneIndex: number | null, filesystem: Filesystem): CourseTrackData | null {
    if (sceneIndex === null || courseInfoBySceneIndex[sceneIndex] === undefined) {
        return null;
    } else {
        return {
            uvtt: filesystem.getOrLoadFile(UVTT, "UVTT", courseInfoBySceneIndex[sceneIndex].uvttIndex),
            specialResetZones: courseInfoBySceneIndex[sceneIndex].specialResetZones,
            progressFixZones: courseInfoBySceneIndex[sceneIndex].progressFixZones,
        }
    }
}

let curHue = 0;
let curLightness = 0.5;
function nextConsistentRandomColor() {
    curHue = (curHue + (107 / 360)) % 1;
    curLightness = (curLightness === 0.5 ? 1 : 0.5);

    let color: Color = colorNewFromRGBA(0, 0, 0, 0);
    colorFromHSL(color, curHue, curLightness, 0.5);
    return color;
}
function resetConsistentRandomColorGenerator() {
    curHue = 0;
    curLightness = 0.5;
}


function BARVecToStandardVec(v: vec3) {
    return vec3.fromValues(v[1], v[2], v[0])
}

export class TrackDataRenderer {
    public showTrack: boolean = false;
    public alsoShowTrackUpVectorAndWidthVector: boolean = false;
    public showProgressValuesNextToTrackPoints: boolean = false;

    public showSpecialResetZones: boolean = false;
    public showProgressFixZones: boolean = false;
    public showProgressFixZoneValues: boolean = false;

    public showTrackSegmentBeginPlanes: boolean = false;
    public showTrackSegmentEndPlanes: boolean = false;

    private segmentIndicesToShow: number[] = [];

    public progressValuesToShow: number[] = [];

    private progressFixZonesZPos: number;
    private progressFixZonesHeight: number;

    constructor(private trackData: CourseTrackData, private debugDraw: DebugDraw) {
        let sortedZVals = trackData.uvtt.pnts.map(p => p.pos[2]).sort((a, b) => a - b);
        let zMin = sortedZVals[0];
        let zMax = sortedZVals[sortedZVals.length - 1];

        this.progressFixZonesZPos = (zMin + zMax) * 0.5;
        this.progressFixZonesHeight = (zMax - zMin) * 0.75;
    }

    public setMinAndMaxSegmentIndices(min: number, max: number) {
        if (isNaN(min) || isNaN(max)) {
            this.segmentIndicesToShow = [];
            return;
        }

        this.segmentIndicesToShow = [];
        for (let i = min; i <= Math.min(max, this.trackData.uvtt.pnts.length - 1); i++)
            this.segmentIndicesToShow.push(i);
    }

    public toggleSegment(segIndex: number) {
        const i = this.segmentIndicesToShow.indexOf(segIndex);
        if (i === -1) {
            this.segmentIndicesToShow.push(segIndex);
        } else {
            this.segmentIndicesToShow.splice(i, 1);
        }
    }

    public findNearestSegment(mouseX: number, mouseY: number, viewerInput: ViewerRenderInput): number | null {
        let ctx = getDebugOverlayCanvas2D();
        const cw = ctx.canvas.width;
        const ch = ctx.canvas.height;
        mouseY = ch - mouseY;
        let clipFromWorldMatrix = viewerInput.camera.clipFromWorldMatrix;

        let v4: vec4 = vec4.create();

        let closestSegmentIndex: null | number = null;
        let closestPtDistance: number = Number.MAX_VALUE;

        for (let i = 0; i < this.trackData.uvtt.pnts.length; i++) {
            const pos = this.trackData.uvtt.pnts[i].pos;

            vec4.set(v4, pos[1], pos[2], pos[0], 1.0);
            vec4.transformMat4(v4, v4, clipFromWorldMatrix);
            divideByW(v4, v4);

            // Ignore if offscreen
            if (v4[0] < -1 || v4[0] > 1 || v4[1] < -1 || v4[1] > 1 || v4[2] < -1 || v4[2] > 1)
                continue;

            const ptX = (v4[0] + 1) * cw / 2;
            const ptY = (v4[1] + 1) * ch / 2;

            let dist = Math.hypot(mouseX - ptX, mouseY - ptY);
            if (dist < closestPtDistance) {
                closestSegmentIndex = i;
                closestPtDistance = dist;
            }
        }

        return closestSegmentIndex;
    }

    public prepareToRender(device: GfxDevice, renderInstManager: GfxRenderInstManager, viewerInput: ViewerRenderInput) {
        // TODO: precalc BARToNormal versions instead of doing it every frame?

        resetConsistentRandomColorGenerator();

        if (this.showTrack) {
            for (let pnt of this.trackData.uvtt.pnts) {
                const pos = BARVecToStandardVec(pnt.pos);
                drawWorldSpaceVector(getDebugOverlayCanvas2D(), viewerInput.camera.clipFromWorldMatrix, pos, BARVecToStandardVec(pnt.fwd), pnt.trackSectionLength, colorNewFromRGBA(0.0, 0.5, 0.8, 1), 4);
                drawWorldSpacePoint(getDebugOverlayCanvas2D(), viewerInput.camera.clipFromWorldMatrix, pos, colorNewFromRGBA(0, 0, 1, 1), 10);

                if (this.alsoShowTrackUpVectorAndWidthVector) {
                    let leftPos = vec3.create();
                    vec3.scaleAndAdd(leftPos, pnt.pos, pnt.right, -pnt.trackSectionWidth / 2);
                    drawWorldSpaceVector(getDebugOverlayCanvas2D(), viewerInput.camera.clipFromWorldMatrix, BARVecToStandardVec(leftPos), BARVecToStandardVec(pnt.right), pnt.trackSectionWidth, colorNewFromRGBA(0, 0, 0.2, 1), 4);
                    drawWorldSpaceVector(getDebugOverlayCanvas2D(), viewerInput.camera.clipFromWorldMatrix, pos, BARVecToStandardVec(pnt.up), 5, colorNewFromRGBA(1, 0, 1, 1), 4);
                }
            }
        }

        if (this.showProgressValuesNextToTrackPoints) {
            let drawnPnts = new Set<any>();
            for (let pntAndProgress of this.trackData.uvtt.route) {
                if (!drawnPnts.has(pntAndProgress.pnt)) {
                    drawWorldSpaceText(getDebugOverlayCanvas2D(), viewerInput.camera.clipFromWorldMatrix, BARVecToStandardVec(pntAndProgress.pnt.pos), pntAndProgress.progress.toFixed(3), -20, White, { outline: 6 });
                    drawnPnts.add(pntAndProgress.pnt);
                }
            }
        }

        if (this.showSpecialResetZones) {
            for (let specialResetZone of this.trackData.specialResetZones) {
                let minVec = this.trackData.uvtt.getPointAlongTrack(specialResetZone.progressMin);
                let maxVec = this.trackData.uvtt.getPointAlongTrack(specialResetZone.progressMax);

                let color = nextConsistentRandomColor();
                drawWorldSpacePoint(getDebugOverlayCanvas2D(), viewerInput.camera.clipFromWorldMatrix, BARVecToStandardVec(minVec), color, 30);
                drawWorldSpacePoint(getDebugOverlayCanvas2D(), viewerInput.camera.clipFromWorldMatrix, BARVecToStandardVec(maxVec), color, 30);
                if (this.showProgressFixZoneValues) {
                    let opts = { outline: 6 };
                    drawWorldSpaceText(getDebugOverlayCanvas2D(), viewerInput.camera.clipFromWorldMatrix, BARVecToStandardVec(minVec), specialResetZone.progressMin.toString(), -20, White, opts);
                    drawWorldSpaceText(getDebugOverlayCanvas2D(), viewerInput.camera.clipFromWorldMatrix, BARVecToStandardVec(maxVec), specialResetZone.progressMax.toString(), -20, White, opts);
                }
            }
        }


        if (this.showTrackSegmentBeginPlanes || this.showTrackSegmentEndPlanes) {
            resetConsistentRandomColorGenerator();
            for (let segmentIndex of this.segmentIndicesToShow) {
                let color = nextConsistentRandomColor();
                color.a = 0.2;
                let pnt = this.trackData.uvtt.pnts[segmentIndex];

                if (this.showTrackSegmentBeginPlanes) {
                    this.debugDraw.drawRectSolidRU(BARVecToStandardVec(pnt.pos), BARVecToStandardVec(pnt.right), BARVecToStandardVec(pnt.up), 1500, 1500, color);
                }
                if (this.showTrackSegmentEndPlanes) {
                    let segmentEnd = vec3.create();
                    vec3.scaleAndAdd(segmentEnd, pnt.pos, pnt.fwd, pnt.trackSectionLength);
                    this.debugDraw.drawRectSolidRU(BARVecToStandardVec(segmentEnd), BARVecToStandardVec(pnt.right), BARVecToStandardVec(pnt.up), 1500, 1500, color);
                }
            }
        }

        if (this.showProgressFixZones) {
            resetConsistentRandomColorGenerator();

            // they all have different x values, i checked
            let xValToColorMap: Record<number, Color> = {};

            for (let progressFixZone of this.trackData.progressFixZones) {
                let color;

                if (xValToColorMap[progressFixZone.x] === undefined) {
                    color = nextConsistentRandomColor();
                    color.a = 0.4;

                    this.debugDraw.drawRectSolidRU(
                        vec3.fromValues(progressFixZone.x + progressFixZone.squareHalfSize, progressFixZone.y, this.progressFixZonesZPos),
                        Vec3UnitY, Vec3UnitZ, progressFixZone.squareHalfSize, this.progressFixZonesHeight, color);
                    this.debugDraw.drawRectSolidRU(
                        vec3.fromValues(progressFixZone.x - progressFixZone.squareHalfSize, progressFixZone.y, this.progressFixZonesZPos),
                        Vec3UnitY, Vec3UnitZ, progressFixZone.squareHalfSize, this.progressFixZonesHeight, color);
                    this.debugDraw.drawRectSolidRU(
                        vec3.fromValues(progressFixZone.x, progressFixZone.y + progressFixZone.squareHalfSize, this.progressFixZonesZPos),
                        Vec3UnitX, Vec3UnitZ, progressFixZone.squareHalfSize, this.progressFixZonesHeight, color);
                    this.debugDraw.drawRectSolidRU(
                        vec3.fromValues(progressFixZone.x, progressFixZone.y - progressFixZone.squareHalfSize, this.progressFixZonesZPos),
                        Vec3UnitX, Vec3UnitZ, progressFixZone.squareHalfSize, this.progressFixZonesHeight, color);

                    xValToColorMap[progressFixZone.x] = color;
                } else {
                    color = xValToColorMap[progressFixZone.x];
                }

                drawWorldSpaceAABB(getDebugOverlayCanvas2D(), viewerInput.camera.clipFromWorldMatrix,
                    new AABB(
                        progressFixZone.y - progressFixZone.squareHalfSize,
                        this.progressFixZonesZPos - this.progressFixZonesHeight / 2,
                        progressFixZone.x - progressFixZone.squareHalfSize,
                        progressFixZone.y + progressFixZone.squareHalfSize,
                        this.progressFixZonesZPos + this.progressFixZonesHeight / 2,
                        progressFixZone.x + progressFixZone.squareHalfSize
                    ), null, color);

                let minVec = this.trackData.uvtt.getPointAlongTrack(progressFixZone.progressMin);
                let maxVec = this.trackData.uvtt.getPointAlongTrack(progressFixZone.progressMax);
                let newVec = this.trackData.uvtt.getPointAlongTrack(progressFixZone.newProgress);

                color.a = 1.0;

                drawWorldSpacePoint(getDebugOverlayCanvas2D(), viewerInput.camera.clipFromWorldMatrix, BARVecToStandardVec(minVec), color, 20);
                drawWorldSpacePoint(getDebugOverlayCanvas2D(), viewerInput.camera.clipFromWorldMatrix, BARVecToStandardVec(maxVec), color, 20);
                drawWorldSpacePoint(getDebugOverlayCanvas2D(), viewerInput.camera.clipFromWorldMatrix, BARVecToStandardVec(newVec), color, 50);
                if (this.showProgressFixZoneValues) {
                    let opts = { outline: 6 };
                    drawWorldSpaceText(getDebugOverlayCanvas2D(), viewerInput.camera.clipFromWorldMatrix, BARVecToStandardVec(minVec), progressFixZone.progressMin.toString(), -20, White, opts);
                    drawWorldSpaceText(getDebugOverlayCanvas2D(), viewerInput.camera.clipFromWorldMatrix, BARVecToStandardVec(maxVec), progressFixZone.progressMax.toString(), -20, White, opts);
                    drawWorldSpaceText(getDebugOverlayCanvas2D(), viewerInput.camera.clipFromWorldMatrix, BARVecToStandardVec(newVec), progressFixZone.newProgress.toString(), -20, White, opts);
                }
            }
        }


        for (let progressVal of this.progressValuesToShow) {
            let pnt = this.trackData.uvtt.getPointAlongTrack(progressVal);
            drawWorldSpacePoint(getDebugOverlayCanvas2D(), viewerInput.camera.clipFromWorldMatrix, BARVecToStandardVec(pnt), colorNewFromRGBA(1, 0, 0, 1), 20);
        }
    }
}