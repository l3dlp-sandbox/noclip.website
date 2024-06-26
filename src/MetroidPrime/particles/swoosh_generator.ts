import { InputStream } from '../stream.js';
import { ResourceSystem } from '../resource.js';
import { BaseGenerator, Light } from './base_generator.js';
import { mat4, ReadonlyMat4, ReadonlyVec3, vec3 } from 'gl-matrix';
import { AABB } from '../../Geometry.js';
import { GfxDevice } from '../../gfx/platform/GfxPlatform.js';
import { Color, colorNewFromRGBA } from '../../Color.js';
import { SWHC } from '../swhc.js';
import * as GX_Material from '../../gx/gx_material.js';

const scratchMat4 = mat4.create();
const scratchVec3 = vec3.create();
const scratchColor = colorNewFromRGBA(1.0, 1.0, 1.0, 1.0);

export class SwooshDescription {
    constructor(stream: InputStream, resourceSystem: ResourceSystem) {
    }
}

export function GetSwooshGeneratorDesc(stream: InputStream, resourceSystem: ResourceSystem): SwooshDescription | null {
    const type = stream.readFourCC();
    if (type === 'NONE')
        return null;
    const partId = stream.readAssetID();
    const swhc = resourceSystem.loadAssetByID<SWHC>(partId, 'SWHC');
    if (!swhc)
        return null;
    return swhc.description;
}

export class SwooshGenerator extends BaseGenerator {
    constructor(private swooshDesc: SwooshDescription, private unk: number) {
        super();
    }

    GetGeneratorRate(): number {
        return 0;
    }

    GetGlobalOrientation(): ReadonlyMat4 {
        return scratchMat4;
    }

    GetGlobalScale(): ReadonlyVec3 {
        return scratchVec3;
    }

    GetGlobalTranslation(): ReadonlyVec3 {
        return scratchVec3;
    }

    GetModulationColor(): Color {
        return scratchColor;
    }

    GetOrientation(): ReadonlyMat4 {
        return scratchMat4;
    }

    GetTranslation(): ReadonlyVec3 {
        return scratchVec3;
    }

    Render(): void {
    }

    SetGeneratorRate(rate: number): void {
    }

    SetGlobalOrientation(orientation: ReadonlyMat4): void {
    }

    SetGlobalScale(scale: ReadonlyVec3): void {
    }

    SetGlobalTranslation(translation: ReadonlyVec3): void {
    }

    SetLocalScale(scale: ReadonlyVec3): void {
    }

    SetModulationColor(color: Color): void {
    }

    SetOrientation(orientation: ReadonlyMat4): void {
    }

    SetParticleEmission(emission: boolean): void {
    }

    SetTranslation(translation: ReadonlyVec3): void {
    }

    IsSystemDeletable(): boolean {
        return true;
    }

    GetBounds(): AABB | null {
        return null;
    }

    SystemHasLight(): boolean {
        return false;
    }

    GetLight(): Light {
        return { gxLight: new GX_Material.Light(), custom: false };
    }

    GetParticleCount(): number {
        return 0;
    }

    DestroyParticles() {
    }

    Destroy(device: GfxDevice) {
    }

    Update(device: GfxDevice, dt: number): boolean {
        return false;
    }
}
