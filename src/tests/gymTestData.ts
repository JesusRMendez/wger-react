import { GymExercise } from "@/components/Routines/gym/gymSession";
import { RepetitionUnit } from "@/components/Routines/models/RepetitionUnit";
import { WeightUnit } from "@/components/Routines/models/WeightUnit";
import { testExerciseBenchPress, testExerciseCurls, testExerciseSquats } from "@/tests/exerciseTestdata";

/* The units the way the server names them */
export const gymRepUnitRepetitions = new RepetitionUnit(1, "Repetitions");
export const gymRepUnitFailure = new RepetitionUnit(2, "Until Failure");
export const gymRepUnitSeconds = new RepetitionUnit(3, "Seconds");
export const gymRepUnitMinutes = new RepetitionUnit(4, "Minutes");
export const gymRepUnitKilometers = new RepetitionUnit(6, "Kilometers");

export const gymWeightUnitKg = new WeightUnit(1, "kg");
export const gymWeightUnitLb = new WeightUnit(2, "lb");
export const gymWeightUnitBodyWeight = new WeightUnit(3, "Body Weight");
export const gymWeightUnitPlates = new WeightUnit(4, "Plates");
export const gymWeightUnitKmh = new WeightUnit(5, "km/h");

export const gymSquats: GymExercise = {
    key: '0-1',
    plannedIndex: 0,
    slotEntryId: 1,
    exerciseId: testExerciseSquats.id!,
    exercise: testExerciseSquats,
    type: 'normal',
    nrOfSets: 2,
    repetitions: 5,
    maxRepetitions: 6,
    repetitionUnit: gymRepUnitRepetitions,
    weight: 80,
    maxWeight: null,
    weightUnit: gymWeightUnitKg,
    rir: 2,
    restTime: 120,
    comment: '',
};

export const gymBenchPress: GymExercise = {
    key: '1-2',
    plannedIndex: 1,
    slotEntryId: 2,
    exerciseId: testExerciseBenchPress.id!,
    exercise: testExerciseBenchPress,
    type: 'normal',
    nrOfSets: 1,
    repetitions: 10,
    maxRepetitions: null,
    repetitionUnit: gymRepUnitRepetitions,
    weight: 40,
    maxWeight: null,
    weightUnit: gymWeightUnitLb,
    rir: null,
    // No rest in the plan, the default applies
    restTime: null,
    comment: '',
};

export const gymTimed: GymExercise = {
    key: '2-3',
    plannedIndex: 2,
    slotEntryId: 3,
    exerciseId: testExerciseCurls.id!,
    exercise: testExerciseCurls,
    type: 'normal',
    nrOfSets: 2,
    repetitions: 30,
    maxRepetitions: null,
    repetitionUnit: gymRepUnitSeconds,
    weight: null,
    maxWeight: null,
    weightUnit: gymWeightUnitBodyWeight,
    rir: null,
    restTime: 45,
    comment: 'hold the position',
};

export const gymExercises = [gymSquats, gymBenchPress, gymTimed];
