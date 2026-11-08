import {
    deserializeEmailArgs,
    serializeEmailArgs,
} from './email-queue.constants';

describe('email job args', () => {
    it('round-trips dates through JSON as the same instant', () => {
        const dueDate = new Date('2026-11-30T16:00:00.000Z');
        const args = ['jane@example.com', 'Jane', 'Netflix', '549', dueDate, 3];

        const stored = JSON.parse(
            JSON.stringify(serializeEmailArgs(args)),
        ) as unknown[];
        const revived = deserializeEmailArgs(stored);

        expect(revived[4]).toBeInstanceOf(Date);
        expect((revived[4] as Date).getTime()).toBe(dueDate.getTime());
        expect(revived.slice(0, 4)).toEqual(args.slice(0, 4));
        expect(revived[5]).toBe(3);
    });

    it('leaves null and plain objects alone', () => {
        expect(deserializeEmailArgs([null, { a: 1 }])).toEqual([
            null,
            { a: 1 },
        ]);
    });
});
