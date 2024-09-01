module RockPaperScissors::RockPaperScissors {
    use aptos_std::smart_table::{Self, SmartTable};
    use std::signer;
    use aptos_framework::randomness;
    use std::vector;
    use std::string::{String, utf8};

    const ROCK: u8 = 1;
    const PAPER: u8 = 2;
    const SCISSORS: u8 = 3;

    struct Game has key, store, copy {
        player: address,
        player_move: u8,   
        computer_move: u8,
        result: u8,
    }

    struct UserStats has key, store, copy, drop {
        games_played: u64,
        max_winstreak: u64,
        current_winstreak: u64,
        hands_gif: String,
    }

    struct GlobalState has key {
        users_stats: SmartTable<address, UserStats>,
    }

    struct UserStatsView has drop {
        games_played: u64,
        max_winstreak: u64,
        current_winstreak: u64,
        hands_gif: String,
    }

    struct AllUsersStatsViewItem has drop {
        addr: address,
        games_played: u64,
        max_winstreak: u64,
        hands_gif: String,
    }

    struct GameHistory has key, store {
        games: vector<Game>,
    }

    fun init_module(admin: &signer) {
        move_to(admin, GlobalState {
            users_stats: smart_table::new(),
        })
    }

    public entry fun start_game(account: &signer, new_hands_gif: String) acquires GlobalState, GameHistory {
        let player = signer::address_of(account);
        let users_stats = &mut borrow_global_mut<GlobalState>(@RockPaperScissors).users_stats;

        let game = Game {
            player,
            player_move: 0,
            computer_move: 0,
            result: 0,
        };

        if (!smart_table::contains(users_stats, player)) {
            smart_table::add(users_stats, player, UserStats {
                games_played: 1,
                max_winstreak: 0,
                current_winstreak: 0,
                hands_gif: new_hands_gif,
            });
        } else {
            let user_stats = smart_table::borrow_mut(users_stats, player);
            user_stats.games_played = user_stats.games_played + 1;
        };

        if (!exists<GameHistory>(player)) {
            let history = GameHistory {
                games: vector::empty<Game>(),
            };
            move_to(account, history);
        };

        let history = borrow_global_mut<GameHistory>(player);
        vector::push_back(&mut history.games, game);
    }

    public entry fun set_player_move(account: &signer, player_move: u8) acquires GameHistory {
        let player = signer::address_of(account);
        let history = borrow_global_mut<GameHistory>(player);
        let len = vector::length(&history.games);
        let game = vector::borrow_mut(&mut history.games, len - 1);
        game.player_move = player_move;
    }

    #[randomness]
    entry fun randomly_set_computer_move(account: &signer) acquires GameHistory {
        randomly_set_computer_move_internal(account);
    }

    public(friend) fun randomly_set_computer_move_internal(account: &signer) acquires GameHistory {
        let player = signer::address_of(account);
        let history = borrow_global_mut<GameHistory>(player);
        let len = vector::length(&history.games);
        let game = vector::borrow_mut(&mut history.games, len - 1);
        let random_number = randomness::u8_range(1, 4);
        game.computer_move = random_number;
    }

    public entry fun finalize_game_results(account: &signer, new_hands_gif: String) acquires GameHistory, GlobalState {
        let player = signer::address_of(account);
        let history = borrow_global_mut<GameHistory>(player);
        let len = vector::length(&history.games);
        let game = vector::borrow_mut(&mut history.games, len - 1);
        game.result = determine_winner(game.player_move, game.computer_move);

        let users_stats = &mut borrow_global_mut<GlobalState>(@RockPaperScissors).users_stats;
        let user_stats = smart_table::borrow_mut(users_stats, player);

        // Update winstreak
        if (game.result == 2) {
            user_stats.current_winstreak = user_stats.current_winstreak + 1;

            // Update max_winstreak if current winstreak is greater
            if (user_stats.current_winstreak > user_stats.max_winstreak) {
                user_stats.max_winstreak = user_stats.current_winstreak;
                user_stats.hands_gif = new_hands_gif;
            }
        } else if (game.result == 3) {
            // Reset winstreak only if the player loses
            user_stats.current_winstreak = 0;
        }
    }

    fun determine_winner(player_move: u8, computer_move: u8): u8 {
        if (player_move == ROCK && computer_move == SCISSORS) {
            2 // player wins
        } else if (player_move == PAPER && computer_move == ROCK) {
            2 // player wins
        } else if (player_move == SCISSORS && computer_move == PAPER) {
            2 // player wins
        } else if (player_move == computer_move) {
            1 // draw
        } else {
            3 // computer wins
        }
    }

    #[view]
    public fun get_player_move(account_addr: address): u8 acquires GameHistory {
        let history = borrow_global<GameHistory>(account_addr);
        let len = vector::length(&history.games);
        let game = vector::borrow(&history.games, len - 1);
        game.player_move
    }

    #[view]
    public fun get_computer_move(account_addr: address): u8 acquires GameHistory {
        let history = borrow_global<GameHistory>(account_addr);
        let len = vector::length(&history.games);
        let game = vector::borrow(&history.games, len - 1);
        game.computer_move
    }

    #[view]
    public fun get_game_results(account_addr: address): u8 acquires GameHistory {
        let history = borrow_global<GameHistory>(account_addr);
        let len = vector::length(&history.games);
        let game = vector::borrow(&history.games, len - 1);
        game.result
    }

    #[view]
    public fun get_user_stats(account_addr: address): UserStatsView acquires GlobalState {
        let users_stats = &borrow_global<GlobalState>(@RockPaperScissors).users_stats;
        if (!smart_table::contains(users_stats, account_addr)) {
            UserStatsView {
                games_played: 0,
                max_winstreak: 0,
                current_winstreak: 0,
                hands_gif: utf8(b""),
            }
        } else {
            let user_stats = smart_table::borrow(users_stats, account_addr);
            UserStatsView {
                games_played: user_stats.games_played,
                max_winstreak: user_stats.max_winstreak,
                current_winstreak: user_stats.current_winstreak,
                hands_gif: user_stats.hands_gif,
            }
        }
    }

    #[view]
    public fun get_leaderboard(): vector<AllUsersStatsViewItem> acquires GlobalState {
        let users_stats = &borrow_global<GlobalState>(@RockPaperScissors).users_stats;
        let leaderboard = vector::empty<AllUsersStatsViewItem>();
        let keys = smart_table::keys(users_stats);
        let i = 0;
        let len = vector::length(&keys);
        while (i < len) {
            let addr = *vector::borrow(&keys, i);
            let user_stats = smart_table::borrow(users_stats, addr);
            vector::push_back(&mut leaderboard, AllUsersStatsViewItem {
                addr,
                games_played: user_stats.games_played,
                max_winstreak: user_stats.max_winstreak,
                hands_gif: user_stats.hands_gif,
            });
            i = i + 1;
        };
        leaderboard
    }

    #[view]
    public fun get_game_history(account_addr: address): vector<Game> acquires GameHistory {
        let history = borrow_global<GameHistory>(account_addr);
        history.games
    }
}