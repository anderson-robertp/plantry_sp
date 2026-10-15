/**
 * MongoDB update pipelines for changing a pantry row's amount.
 *
 * A row stores the amount twice (`quantity` in its own unit, `baseQuantity` in g / ml / piece) and
 * the two must stay in step. Both are changed in one atomic update, scaling `quantity` by the same
 * ratio as `baseQuantity`, so a concurrent edit can't leave them disagreeing.
 * (Inside one $set stage every `$field` refers to the document as it was before the stage.)
 */

/** Remove `take` base units, never going below zero. */
export function consumePipeline(take: number) {
  const remaining = { $max: [0, { $subtract: ["$baseQuantity", take] }] };
  return [
    {
      $set: {
        quantity: {
          $cond: [
            { $gt: ["$baseQuantity", 0] },
            { $multiply: ["$quantity", { $divide: [remaining, "$baseQuantity"] }] },
            "$quantity",
          ],
        },
        baseQuantity: remaining,
      },
    },
  ];
}

/** Put back `baseQuantity` base units, which are `quantity` in the row's own unit. */
export function restorePipeline(baseQuantity: number, quantity: number) {
  return [
    {
      $set: {
        baseQuantity: { $add: ["$baseQuantity", baseQuantity] },
        quantity: { $add: ["$quantity", quantity] },
      },
    },
  ];
}
