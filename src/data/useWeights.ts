import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/client';
import type { WeightEntry } from '../models';
import type { WeightPoint } from '../lib/weightChart';

/** Live list of the user's weigh-ins, newest first. null while loading. */
export function useWeights(uid: string): WeightPoint[] | null {
  const [weights, setWeights] = useState<WeightPoint[] | null>(null);
  useEffect(
    () =>
      onSnapshot(
        collection(db, 'users', uid, 'weights'),
        (snap) => setWeights(snap.docs.map((d) => ({ date: d.id, kg: (d.data() as WeightEntry).kg })).sort((a, b) => b.date.localeCompare(a.date))),
        () => setWeights((w) => w ?? []),
      ),
    [uid],
  );
  return weights;
}
