/**
 * Coverage boundary for the Paper B evaluation.
 *
 * Section 6 evaluates the permission registry, semantic-asset lifecycle
 * registry, consortium governance, validation committee, and voting token.
 * The files below are unfinished scaffolds outside that stated object of
 * evaluation and are excluded so their zero coverage does not distort the
 * reported measurements.
 */
module.exports = {
  skipFiles: [
    "Dispute_Resolution_Board.sol",
    "_MFSSIA_authentication.sol",
    "_RDF_data_retrieval.sol",
    "_dao_management.sol",
    "_data_access.sol",
    "_dispute_resolution.sol",
    "_membersip_manager.sol",
  ],
  istanbulReporter: ["html", "json", "lcov", "text", "text-summary"],
};
