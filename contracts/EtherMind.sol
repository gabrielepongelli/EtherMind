// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

// Uncomment this line to use console.log
//import "hardhat/console.sol";
import "./libs/Game.sol";
import "./libs/MatchRegister.sol";
import "./libs/Utils.sol";
import "./libs/Configs.sol";

contract EtherMind {
    MatchRegister private matchReg;

    /**
     * Modifiers
     */

    /**
     * Require that the id specified is linked to an existing match.
     * @param id The id of the match to check.
     */
    modifier onlyExistingIds(address id) {
        require(matchReg.isValid(id), "The match specified does not exist");
        _;
    }

    /**
     * Require that the id specified is linked to an existing match or is zero.
     * @param id The id of the match to check.
     */
    modifier onlyExistingIdsOrZero(address id) {
        require(id == address(0) || matchReg.isValid(id), "Invalid match id");
        _;
    }

    /**
     * Require that the caller is one of the players of the specified match.
     * @param id The id of the match to check. The match is assumed to already
     * exist.
     */
    modifier onlyAllowedPlayers(address id) {
        require(
            msg.sender == matchReg.getMatch(id).creator ||
                msg.sender == matchReg.getMatch(id).challenger,
            "You are not part of the match specified"
        );
        _;
    }

    /**
     * Require that the game is in the specified phase.
     * @param id The id of the match to check. The match is assumed to already
     * exist.
     * @param phase The phase(s) in which the game should be. If is more than
     * one, the check passes if the game is in one of the specified phases.
     */
    modifier onlyGamesInPhase(address id, Phase phase) {
        require(
            matchReg.getMatch(id).phase == phase,
            "Operation not permitted in this phase of the game"
        );
        _;
    }

    /**
     * Require that the caller is the CodeMaker of the specified match.
     * @param id The id of the match to check. The match is assumed to already
     * exist.
     */
    modifier onlyCodeMaker(address id) {
        Game storage game = matchReg.getMatch(id);
        require(
            game.isCodeMaker(msg.sender),
            "The caller is not the CodeMaker"
        );
        _;
    }

    /**
     * Require that the caller is the CodeBreaker of the specified match.
     * @param id The id of the match to check. The match is assumed to already
     * exist.
     */
    modifier onlyCodeBreaker(address id) {
        Game storage game = matchReg.getMatch(id);
        require(
            game.isCodeBreaker(msg.sender),
            "The caller is not the CodeBreaker"
        );
        _;
    }

    /**
     * Events
     */

    event MatchCreated(address indexed id, address indexed creator);
    event MatchStarted(
        address indexed id,
        address creator,
        address indexed challenger
    );
    event StakeProposal(
        address indexed id,
        address indexed by,
        uint256 proposal
    );
    event StakeFixed(address indexed id, uint256 stake);
    event StakePayed(address indexed id, address indexed player);
    event GameStarted(address indexed id);
    event RoundStarted(
        address indexed id,
        uint round,
        address codemaker,
        address codebreaker
    );
    event SolutionHashSubmitted(address indexed id, address from);
    event GuessSubmitted(address indexed id, address from, Code guess);
    event FeedbackSubmitted(
        address indexed id,
        address from,
        Feedback feedback
    );
    event RoundEnded(address indexed id, uint round);
    event SolutionSubmitted(address indexed id, address from, Code solution);
    event ScoresUpdated(
        address indexed id,
        uint creatorScore,
        uint challengerScore
    );
    event PlayerPunished(address indexed id, address player, string reason);
    event GameEnded(address indexed id);
    event RewardDispensed(address indexed id, address to, uint reward);
    event AfkCheckStarted(address indexed id, address from, uint256 time);
    event MatchEnded(address indexed id);
    event Failure(address indexed id, string message);

    /**
     * Punish a player of the match specified.
     * @param id The id of the match where the player that has to be punished
     * is playing in.
     * @param player The player that has to be punished.
     * @param reason The reason why the player will be punished.
     */
    function punish(address id, address player, string memory reason) internal {
        Game storage game = matchReg.getMatch(id);

        uint256 totalStake = game.stake;

        // it should pass, it's just to make sure
        require(
            address(this).balance >= totalStake,
            "Insufficient balance in contract"
        );

        address payable playerToPay = payable(
            game.isCodeMaker(player) ? game.codeBreaker() : game.codeMaker()
        );

        matchReg.deleteMatch(id);
        playerToPay.transfer(totalStake);
        emit PlayerPunished(id, player, reason);
        emit MatchEnded(id);
    }

    /**
     * Create a new match.
     * @param otherPlayer The other player that can join the match. If is 0,
     * then anyone can join the match.
     */
    function createMatch(address otherPlayer) external {
        require(
            msg.sender != otherPlayer,
            "You cannot create a private match with yourself"
        );

        address newId = address(uint160(Utils.rand(1)));

        bool res = matchReg.addMatch(newId, msg.sender, otherPlayer);
        require(res, "An error occurred while creating the new match");

        emit MatchCreated(newId, msg.sender);
    }

    /**
     * Join an existing match.
     * @param id The id of the match to join. If is 0 then the match will be
     * chosen randomly.
     * @param stake The proposed amount of wei to place as game stake.
     */
    function joinMatch(
        address id,
        uint256 stake
    ) external onlyExistingIdsOrZero(id) {
        Game storage game;
        if (id == address(0)) {
            // randomly extract match

            uint nPendingMatches = matchReg.nPendingMatches();
            require(nPendingMatches > 0, "There are no available matches");

            uint rand = Utils.rand(1) % nPendingMatches;
            uint pos = rand;
            do {
                (id, game) = matchReg.getPending(pos);
                pos = (pos + 1) % nPendingMatches;
            } while (msg.sender == game.creator && pos != rand);

            require(
                msg.sender != game.creator,
                "There are no available matches"
            );
        } else {
            // specific game chosen

            game = matchReg.getMatch(id);

            require(
                game.phase == PENDING,
                "The match specified is already started or do not exists"
            );

            require(
                msg.sender != game.creator,
                "You cannot join your own game"
            );

            require(
                (game.flags != IS_PRIVATE) || (game.challenger == msg.sender),
                "You are not allowed to join this match"
            );
        }

        matchReg.startMatch(id, msg.sender);
        emit MatchStarted(id, game.creator, game.challenger);

        game.newStake(msg.sender, stake);
        emit StakeProposal(id, msg.sender, game.stake);
    }

    /**
     * Propose a new stake value or confirm the current one.
     * @param id The id of the match on which to operate.
     * @param stake The stake value proposed. If the stake proposed is equal to
     * the stake proposed by the other player, then this call act as stake
     * confirmation. If instead it is different, this will be the new stake
     * value proposed to the other player.
     */
    function stakeProposal(
        address id,
        uint256 stake
    )
        external
        onlyExistingIds(id)
        onlyGamesInPhase(id, STAKE_DECISION)
        onlyAllowedPlayers(id)
    {
        Game storage game = matchReg.getMatch(id);
        game.newStake(msg.sender, stake);

        if (game.phase == STAKE_PAYMENT) {
            // stake value decided
            emit StakeFixed(id, stake);
        } else {
            emit StakeProposal(id, msg.sender, game.stake);
        }
    }

    /**
     * Pay the decided stake.
     * @param id The id of the match on which to operate.
     */
    function payStake(
        address id
    )
        external
        payable
        onlyExistingIds(id)
        onlyGamesInPhase(id, STAKE_PAYMENT)
        onlyAllowedPlayers(id)
    {
        Game storage game = matchReg.getMatch(id);

        require(game.stake == msg.value, "Wrong stake value");
        require(!game.hasAlreadyPayed(msg.sender), "You have already payed");

        bool hasAllPayed = game.newPayment(msg.sender);
        emit StakePayed(id, msg.sender);

        if (hasAllPayed) {
            // both players have payed their stake, so the game can begin
            game.stopAfkTimer();
            (address maker, address breaker) = game.startNewRound();
            emit GameStarted(id);
            emit RoundStarted(id, game.round, maker, breaker);
        }
    }

    /**
     * Upload the hash of the solution to use in a new round.
     * @param id The id of the match on which to operate.
     * @param solutionHash The salted hash of the solution.
     */
    function newSolutionHash(
        address id,
        bytes32 solutionHash
    )
        external
        onlyExistingIds(id)
        onlyGamesInPhase(id, ROUND_START)
        onlyCodeMaker(id)
    {
        Game storage game = matchReg.getMatch(id);

        // in case it was active
        game.stopAfkTimer();

        game.submitSolutionHash(solutionHash);
        emit SolutionHashSubmitted(id, msg.sender);
    }

    /**
     * Upload a new guess.
     * @param id The id of the match on which to operate.
     * @param guess The new guess.
     */
    function newGuess(
        address id,
        Code guess
    )
        public
        onlyExistingIds(id)
        onlyGamesInPhase(id, GUESS_SUBMISSION)
        onlyCodeBreaker(id)
    {
        require(guess.checkFromat(), "Invalid guess format");

        Game storage game = matchReg.getMatch(id);

        // in case it was active
        game.stopAfkTimer();

        game.submitGuess(guess);
        emit GuessSubmitted(id, msg.sender, guess);
    }

    /**
     * Upload a new feedback related to the last guess uploaded.
     * @param id The id of the match on which to operate.
     * @param feedback The new feedback.
     */
    function newFeedback(
        address id,
        Feedback feedback
    )
        public
        onlyExistingIds(id)
        onlyGamesInPhase(id, FEEDBACK_SUBMISSION)
        onlyCodeMaker(id)
    {
        require(feedback.checkFromat(), "Invalid feedback format");

        Game storage game = matchReg.getMatch(id);

        // in case it was active
        game.stopAfkTimer();

        game.submitFeedback(feedback);
        emit FeedbackSubmitted(id, msg.sender, feedback);

        if (game.isRoundEnded()) {
            emit RoundEnded(id, game.round);
        }
    }

    /**
     * Upload the solution of this round.
     * @param id The id of the match on which to operate.
     * @param solution The solution of the round.
     * @param salt The salt used in the calculation of the solution hash.
     */
    function uploadSolution(
        address id,
        Code solution,
        bytes4 salt
    )
        external
        onlyExistingIds(id)
        onlyGamesInPhase(id, ROUND_END)
        onlyCodeMaker(id)
    {
        require(solution.checkFromat(), "Invalid solution format");

        Game storage game = matchReg.getMatch(id);

        if (game.submitFinalSolution(solution, salt)) {
            // solution hashes match

            game.stopAfkTimer();
            emit SolutionSubmitted(id, msg.sender, solution);

            game.startDisputeTimer(block.number);
            game.updateScores();
            emit ScoresUpdated(id, game.creatorScore, game.challengerScore);

            if (game.endGame()) {
                emit GameEnded(id);
            } else {
                (address maker, address breaker) = game.startNewRound();
                emit RoundStarted(id, game.round, maker, breaker);
            }
        } else {
            // solution dosen't match -> punish CodeMaker
            punish(id, msg.sender, "Wrong solution provided");
        }
    }

    /**
     * Start a new dispute.
     * @param id The id of the match on which to operate.
     * @param feedbackIdx An array of indexes representing the feedbacks that
     * have to be checked.
     */
    function dispute(
        address id,
        uint8[] calldata feedbackIdx
    )
        external
        onlyExistingIds(id)
        onlyGamesInPhase(id, ROUND_START)
        onlyCodeMaker(id)
    {
        Game storage game = matchReg.getMatch(id);

        require(
            game.round > 1,
            "Operation not permitted in this phase of the game"
        );

        require(
            !game.isDisputeTimerEnded(block.number),
            "The request is too late, dispute refuted"
        );

        require(
            feedbackIdx.length <= Configs.N_GUESSES && feedbackIdx.length > 0,
            "Invalid number of feedback indexes passed"
        );

        for (uint8 i = 0; i < feedbackIdx.length; i++) {
            require(
                feedbackIdx[i] < game.feedbacks.length,
                "Invalid index submitted"
            );
        }

        if (game.verifyFeedbacks(feedbackIdx)) {
            punish(id, msg.sender, "Player unjustly accused the opponent");
        } else {
            // cheating detected, punish the OLD CodeMaker (the NEW CodeBreaker)
            punish(id, game.codeBreaker(), "Player provided false feedbacks");
        }
    }

    /**
     * Request an AFK check of the opponent.
     * @param id The id of the match on which to operate.
     */
    function startAfkCheck(
        address id
    )
        external
        onlyExistingIds(id)
        onlyGamesInPhase(
            id,
            STAKE_PAYMENT |
                ROUND_START |
                GUESS_SUBMISSION |
                FEEDBACK_SUBMISSION |
                ROUND_END
        )
        onlyAllowedPlayers(id)
    {
        Game storage game = matchReg.getMatch(id);

        require(!game.isAfkTimerStarted(), "AFK check already started");

        // check that whoever is calling is in the position to wait the other
        require(
            game.canStartAfkTimer(msg.sender),
            "You can't ask for an afk check"
        );

        game.startAfkTimer(block.number);
        emit AfkCheckStarted(id, msg.sender, Configs.AFK_MAX);
    }

    /**
     * Stop the match if the other player hasn't passed the AFK check.
     * @param id The id of the match on which to operate.
     */
    function stopMatchForAfk(
        address id
    )
        external
        onlyExistingIds(id)
        onlyGamesInPhase(
            id,
            STAKE_PAYMENT |
                ROUND_START |
                GUESS_SUBMISSION |
                FEEDBACK_SUBMISSION |
                ROUND_END
        )
        onlyAllowedPlayers(id)
    {
        Game storage game = matchReg.getMatch(id);

        require(game.isAfkTimerStarted(), "No AFK check was started");
        require(
            game.isAfkTimerEnded(block.number),
            "Too early to end the match for AFK"
        );

        if (game.isCodeMakerWaited()) {
            punish(id, game.codeMaker(), "Player is AFK");
        } else if (game.isCodeBreakerWaited()) {
            punish(id, game.codeBreaker(), "Player is AFK");
        } else {
            // invalid state, return stakes and end the match
            address payable creator = payable(game.creator);
            address payable challenger = payable(game.challenger);
            uint256 refundAmount = game.stake / 2;

            matchReg.deleteMatch(id);
            creator.transfer(refundAmount);
            challenger.transfer(refundAmount);
            emit Failure(id, "Internal error");
            emit MatchEnded(id);
        }
    }

    /**
     * Check the winner at the end of the game and terminate the match.
     * @param id The id of the match on which to operate.
     */
    function checkWinner(
        address id
    )
        external
        onlyExistingIds(id)
        onlyGamesInPhase(id, GAME_END)
        onlyAllowedPlayers(id)
    {
        Game storage game = matchReg.getMatch(id);

        // it should pass, it's just to make sure
        require(
            address(this).balance >= game.stake,
            "Insufficient balance in contract"
        );

        // if this is called by the CodeMaker force him to wait for the dispute
        // timeout, otherwise do it immediately
        require(
            game.isCodeBreaker(msg.sender) ||
                game.isDisputeTimerEnded(block.number),
            "You must first wait for the dispute time"
        );

        address payable winner = payable(game.winner());
        if (winner != address(0)) {
            // transfer the amount to the winner
            // double the stake because
            uint256 totalStake = game.stake;
            matchReg.deleteMatch(id);
            winner.transfer(totalStake);
            emit RewardDispensed(id, msg.sender, totalStake);
        } else {
            // it's a draw
            uint256 totalStake = game.stake / 2;
            address payable creator = payable(game.creator);
            address payable challenger = payable(game.challenger);

            matchReg.deleteMatch(id);
            creator.transfer(totalStake);
            challenger.transfer(totalStake);

            emit RewardDispensed(id, creator, totalStake);
            emit RewardDispensed(id, challenger, totalStake);
        }

        emit MatchEnded(id);
    }
}
