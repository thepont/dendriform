import {produceWithPatches, nothing} from 'immer';
import {applyPatches, optimise} from 'dendriform-immer-patch-optimiser';

import type {Draft} from 'immer';
import type {DendriformPatch} from 'dendriform-immer-patch-optimiser';

export type PatchPair<V> = {
    __patches: (base: V) => DendriformPatch[];
    __patchesInverse: (base: V) => DendriformPatch[];
};

export type ImmerProducer<V> = (draft: Draft<V>) => V | undefined | void;
export type ToProduce<V> = V | PatchPair<V> | ImmerProducer<V>;

function isPatchPair<V>(toProduce: ToProduce<V>): toProduce is PatchPair<V> {
    const patchPair = toProduce as PatchPair<V>;
    return patchPair && !!patchPair.__patches && !!patchPair.__patchesInverse;
}

function isImmerProducer<V>(toProduce: ToProduce<V>): toProduce is ImmerProducer<V> {
    return typeof (toProduce as ImmerProducer<V>) === 'function';
}

export const producePatches = <V>(base: V, toProduce: ToProduce<V>): [V, DendriformPatch[], DendriformPatch[]] => {
    if(isPatchPair(toProduce)) {
        const patches = toProduce.__patches(base);
        const patchesInverse = toProduce.__patchesInverse(base);
        const newValue = applyPatches(base, patches);

        return [
            newValue as V,
            patches,
            patchesInverse
        ];
    }

    const [newValue, patches, inversePatches] = produceWithPatches(base, draft => {
        if(isImmerProducer(toProduce)) {
            return toProduce(draft);
        }
        return toProduce === undefined ? nothing : toProduce;
    });

    return [
        newValue as V,
        patches
            ? optimise(base, patches)
            : [{op: 'replace', path: [], value: newValue}],
        inversePatches
            ? optimise(newValue, inversePatches)
            : [{op: 'replace', path: [], value: base}]
    ];
};
