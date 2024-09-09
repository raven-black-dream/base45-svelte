import { expect, test } from 'vitest'
import { calculateWorkoutCreation } from './mesocycle'

test('example workout creation test', () => {
    // this is the bare bones of a unit test
    // it's not a useful test case as is, but is how you would start to set up useful test cases
    // run tests with:
    // npm run test
    const now = new Date();
    const endDate = new Date(now.getTime() + 10000);
    const dayMap = new Map();
    dayMap.set('TuesdayID', 2);
    const result = calculateWorkoutCreation('1', now, endDate, '1', '1', dayMap, 'TuesdayID', 'TuesdayID');
    console.log(result);
    expect(result).toBe("what it should actually return");
})