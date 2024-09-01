module HandsNFT::main {
    use aptos_framework::event;
    use aptos_framework::object;
    use aptos_framework::object::ExtendRef;
    use aptos_std::string_utils::{to_string};
    use aptos_token_objects::collection;
    use aptos_token_objects::token;
    use std::error;
    use std::option;
    use std::signer::address_of;
    use std::string::{Self, String};

    const ENOT_AVAILABLE: u64 = 1;

    struct Hand has key {
        name: String,
        images: vector<String>,
        gif: String,
        mutator_ref: token::MutatorRef,
        burn_ref: token::BurnRef,
    }

    #[event]
    struct MintHandEvent has drop, store {
        token_name: String,
        hand_name: String,
    }

    // We need a contract signer as the creator of the Hand collection and Hand token
    // Otherwise we need admin to sign whenever a new Hand token is minted which is inconvenient
    struct ObjectController has key {
        // This is the extend_ref of the app object, not the extend_ref of collection object or token object
        // app object is the creator and owner of Hand collection object
        // app object is also the creator of all Hand token (NFT) objects
        // but owner of each token object is Hand owner (i.e. user who mints Hand)
        app_extend_ref: ExtendRef,
    }

    const APP_OBJECT_SEED: vector<u8> = b"HAND";
    const HAND_COLLECTION_NAME: vector<u8> = b"Hand Collection";
    const HAND_COLLECTION_DESCRIPTION: vector<u8> = b"Hand Collection Description";
    const HAND_COLLECTION_URI: vector<u8> = b"https://amethyst-implicit-silkworm-944.mypinata.cloud/ipfs/QmPEk2Bi58FGWmA3tT93bHJQeh9pJfk1kcYbQ2hxZGRMUp";
    
    // This function is only called once when the module is published for the first time.
    fun init_module(account: &signer) {
        let constructor_ref = object::create_named_object(
            account,
            APP_OBJECT_SEED,
        );
        let extend_ref = object::generate_extend_ref(&constructor_ref);
        let app_signer = &object::generate_signer(&constructor_ref);

        move_to(app_signer, ObjectController {
            app_extend_ref: extend_ref,
        });

        create_hand_collection(app_signer);
    }

    fun get_app_signer_addr(): address {
        object::create_object_address(&@HandsNFT, APP_OBJECT_SEED)
    }

    fun get_app_signer(): signer acquires ObjectController {
        object::generate_signer_for_extending(&borrow_global<ObjectController>(get_app_signer_addr()).app_extend_ref)
    }

    // Create the collection that will hold all the Hands
    fun create_hand_collection(creator: &signer) {
        let description = string::utf8(HAND_COLLECTION_DESCRIPTION);
        let name = string::utf8(HAND_COLLECTION_NAME);
        let uri = string::utf8(HAND_COLLECTION_URI);

        collection::create_unlimited_collection(
            creator,
            description,
            name,
            option::none(),
            uri,
        );
    }

    // Create an Hand token object
    public entry fun create_Hand(
        user: &signer,
        name: String,
        images: vector<String>,
        gif: String,

    ) acquires ObjectController {
        let uri = string::utf8(HAND_COLLECTION_URI);
        let description = string::utf8(HAND_COLLECTION_DESCRIPTION);
        let token_name = name;
        let user_addr = address_of(user);
        let user_addr_string = to_string(&user_addr);
        string::append_utf8(&mut token_name, b": #");
        string::append(&mut token_name, user_addr_string);

        let constructor_ref = token::create_named_token(
            &get_app_signer(),
            string::utf8(HAND_COLLECTION_NAME),
            description,
            token_name,
            option::none(),
            uri,
        );

        let token_signer = object::generate_signer(&constructor_ref);
        let mutator_ref = token::generate_mutator_ref(&constructor_ref);
        let burn_ref = token::generate_burn_ref(&constructor_ref);
        let transfer_ref = object::generate_transfer_ref(&constructor_ref);

        // initialize/set default Hand struct values
        let ship = Hand {
            name,
            images,
            gif,
            mutator_ref,
            burn_ref,
        };

        move_to(&token_signer, ship);

        // Emit event for minting Hand token
        event::emit<MintHandEvent>(
            MintHandEvent {
                token_name,
                hand_name: name,
            },
        );

        object::transfer_with_ref(object::generate_linear_transfer_ref(&transfer_ref), address_of(user));
    }

    // Get reference to Hand token object (CAN'T modify the reference)
    #[view]
    public fun get_hand_address(creator_addr: address, name: String): (address) {
        let collection = string::utf8(HAND_COLLECTION_NAME);
        let token_name = name;
        let user_addr_string = to_string(&creator_addr);
        string::append_utf8(&mut token_name, b": #");
        string::append(&mut token_name, user_addr_string);
        let creator_addr = get_app_signer_addr();
        let token_address = token::create_token_address(
            &creator_addr,
            &collection,
            &token_name,
        );

        token_address
    }

    // Get collection address (also known as collection ID) of hand collection
    // Collection itself is an object, that's why it has an address
    #[view]
    public fun get_hand_collection_address(): (address) {
        let collection_name = string::utf8(HAND_COLLECTION_NAME);
        let creator_addr = get_app_signer_addr();
        collection::create_collection_address(&creator_addr, &collection_name)
    }

    // Returns true if this address owns an Hand
    #[view]
    public fun has_hand(owner_addr: address, name: String): (bool) {
        let token_address = get_hand_address(owner_addr, name);

        exists<Hand>(token_address)
    }

    // Returns all fields for this Hand (if found)
    #[view]
    public fun get_hand(
        owner_addr: address,
        name: String,
    ): (String, vector<String>, String) acquires Hand {
        // if this address doesn't have an Hand, throw error
        assert!(has_hand(owner_addr, name), error::unavailable(ENOT_AVAILABLE));

        let token_address = get_hand_address(owner_addr, name);
        let hand = borrow_global<Hand>(token_address);

        // view function can only return primitive types.
        (hand.name, hand.images, hand.gif)
    }
}