"use client";
import {
    useWallet,
    InputTransactionData,
} from "@aptos-labs/wallet-adapter-react";
import {
    Account,
    AccountAddress,
    AnyNumber,
    Aptos,
    AptosConfig,
    InputViewFunctionData,
    Network,
    NetworkToNetworkName,
    Ed25519PrivateKey 
} from "@aptos-labs/ts-sdk";
import { FC, ReactNode, useState, useContext, createContext } from "react";
import { createTheme, ThemeProvider, StyledEngineProvider } from '@mui/material/styles';

import { AlertProvider, useAlert } from "../provider/AlertProvider";
import { AutoConnectProvider } from "../provider/AutoConnectProvider";
import { WalletContext } from "./WalletContext";
import { UserContextProvider } from "./UserContext";
import { Hands } from "../Hands";

export const SPACESHIP_ADMIN_PRIVATEKEY = process.env.NEXT_PUBLIC_SPACESHIP_ADMIN_PRIVATEKEY;

const theme = createTheme({
    palette: {
        primary: {
        main: "#000000",
        },
        secondary: {
        main: "#FFFFFF",
        },
    },
});

interface user_stats {
    current_winstreak: string;
    games_played: string;
    hands_gif: string;
    max_winstreak: string;
};

interface AppContextState {
    aptos: any;
    adminAccount: Account | null;
    myBalance: number;
    userMove: number;
    computerMove: number;
    gameResult: number;
    gameHistory: string[];
    winstreak: number;
    userStats: user_stats;
    leaderboard: any[];
    myHands: Hands[];
    setUserMove: (userMove: number) => void;
    setComputerMove: (computerMove: number) => void;
    setGameResult: (gameResult: number) => void;
    setAdminAccount: (admin: Account) => void;
    setMyHands: (myHands: Hands[]) => void;
    fetchAdminAccount: (adminPrivateKey: string) => Promise<Account>;
    fetchBalance: (accountAddress: AccountAddress, versionToWaitFor?: bigint | undefined) => Promise<void>;
    handleStartGame: (admin: Account, account: AccountAddress, playerMove: number, handsGif: string) => Promise<string>;
    handleViewGame: (admin: Account, account: AccountAddress) => void;
    getGameHistory: (admin: Account, account: AccountAddress) => void;
    getUserStats: (admin: Account, account: AccountAddress) => void;
    getLeaderboard: (admin: Account) => void;
    handleMint: (admin: Account, account: AccountAddress, amount: number, ship: Hands) => Promise<string>;
    fetchHands: (admin: Account, account: AccountAddress, handName: string) => void;
};

export const AppContexts = createContext<AppContextState | undefined>(
    undefined
);

export function useAppContext(): AppContextState {
    const context = useContext(AppContexts);
    if (!context)
        throw new Error("useAppContext must be used within an AppContextProvider");
    return context;
};

const AppContextProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const [adminAccount, setAdminAccount] = useState<Account | null>(null);
    const APT = "0x1::aptos_coin::AptosCoin";
    const APT_UNIT = 100_000_000;
    const config = new AptosConfig({ network: Network.TESTNET });
    const aptos = new Aptos(config);
    const {
        signAndSubmitTransaction,
    } = useWallet();
    const { setSuccessAlertMessage, setErrorAlertMessage, setLoadingAlertMessage, setLoadingUpdateAlertMessage } = useAlert();
    const [myBalance, setMyBalance] = useState<number>(0);
    const [userMove, setUserMove] = useState<number>(0);
    const [computerMove, setComputerMove] = useState<number>(0);
    const [gameResult, setGameResult] = useState<number>(0);
    const [gameHistory, setGameHistory] = useState<any[]>([]);
    const [winstreak, setWinstreak] = useState<number>(0);
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [userStats, setUserStats] = useState<user_stats>({
        current_winstreak: "0",
        games_played: "0",
        hands_gif: "",
        max_winstreak: "0",
    });
    const [myHands, setMyHands] = useState<Hands[]>([]);

    const fetchAdminAccount = async (adminPrivateKey: string) : Promise<Account> => {
        const privateKey = new Ed25519PrivateKey(adminPrivateKey);
        const account = await Account.fromPrivateKey({ privateKey });

        return account;
    };

    const fetchBalance = async (accountAddress: AccountAddress, versionToWaitFor?: bigint | undefined) => {
        try {
            const amount = await aptos.getAccountAPTAmount({
                accountAddress,
                minimumLedgerVersion: versionToWaitFor ?? undefined,
            });
            
            setMyBalance(amount / 100000000);
        } catch (error: any) {
            setErrorAlertMessage(error.message);
        }
    };

    const handleStartGame = async (admin: Account, account: AccountAddress, playerMove: number, handsGif: string) : Promise<string> => {
        const loadingMessage = `Please wait...`;
        const id = setLoadingAlertMessage(loadingMessage);

        try {
            const txnStartGame = await startGame(id, admin, account, handsGif);

            if (txnStartGame === "Error") {
                setLoadingUpdateAlertMessage(id, "Failed to start game. Please try again later", "error");
                await fetchBalance(account);
                return "Error";
            }

            const txnSetPlayerMove = await setPlayerMove(id, admin, account, playerMove);

            if (txnSetPlayerMove === "Error") {
                setLoadingUpdateAlertMessage(id, "Failed to set player move. Please try again later", "error");
                await fetchBalance(account);
                return "Error";
            }

            const txnSetComputerMove = await setComputerRandomMove(id, admin, account);

            if (txnSetComputerMove === "Error") {
                setLoadingUpdateAlertMessage(id, "Failed to set random computer move. Please try again later", "error");
                await fetchBalance(account);
                return "Error";
            }

            const texnFinalizeGame = await finalizeGame(id, admin, account, handsGif);

            if (texnFinalizeGame === "Error") {
                setLoadingUpdateAlertMessage(id, "Failed to finalize game. Please try again later", "error");
                await fetchBalance(account);
                return "Error";
            }

            await fetchBalance(account);

            return txnStartGame;
        } catch (error: any) {
            return "Error";
        }
    };

    const startGame = async (id: any, admin: Account, account: AccountAddress, handsGif: string) : Promise<string> => {
        try {
            const response = await signAndSubmitTransaction({
                sender: account,
                data: {
                    function: `${admin.accountAddress}::RockPaperScissors::start_game`,
                    typeArguments: [],
                    functionArguments: [handsGif],
                },
            });

            await aptos.waitForTransaction({
                transactionHash: response.hash,
            });

            setLoadingUpdateAlertMessage(id, `Start Game Success! With hash ${response.hash}`, "success");

            return response.hash;
        } catch (error: any) {
            return "Error";
        }
    };

    const setPlayerMove = async (id: any, admin: Account, account: AccountAddress, playerMove: number) : Promise<string> => {
        try {
            const response = await signAndSubmitTransaction({
                sender: account,
                data: {
                    function: `${admin.accountAddress}::RockPaperScissors::set_player_move`,
                    typeArguments: [],
                    functionArguments: [playerMove],
                },
            });

            await aptos.waitForTransaction({
                transactionHash: response.hash,
            });

            setLoadingUpdateAlertMessage(id, `Set Player Move Success! With hash ${response.hash}`, "success");

            return response.hash;
        } catch (error: any) {
            return "Error";
        }
    };

    const setComputerRandomMove = async (id: any, admin: Account, account: AccountAddress) : Promise<string> => {
        try {
            const response = await signAndSubmitTransaction({
                sender: account,
                data: {
                    function: `${admin.accountAddress}::RockPaperScissors::randomly_set_computer_move`,
                    typeArguments: [],
                    functionArguments: [],
                },
            });

            await aptos.waitForTransaction({
                transactionHash: response.hash,
            });

            setLoadingUpdateAlertMessage(id, `Set Random Computer Move Success! With hash ${response.hash}`, "success");

            return response.hash;
        } catch (error: any) {
            return "Error";
        }
    };

    const finalizeGame = async (id: any, admin: Account, account: AccountAddress, handsGif: string) : Promise<string> => {
        try {
            const response = await signAndSubmitTransaction({
                sender: account,
                data: {
                    function: `${admin.accountAddress}::RockPaperScissors::finalize_game_results`,
                    typeArguments: [],
                    functionArguments: [handsGif],
                },
            });

            await aptos.waitForTransaction({
                transactionHash: response.hash,
            });

            setLoadingUpdateAlertMessage(id, `Finalize Game Success! With hash ${response.hash}`, "success");

            return response.hash;
        } catch (error: any) {
            return "Error";
        }    
    };

    const handleViewGame = async (admin: Account, account: AccountAddress) => {
        await getComputerMove(admin, account);
        await getPlayerMove(admin, account);
        await getGameResult(admin, account);
        await getGameHistory(admin, account);
        await getUserStats(admin, account);
        await getLeaderboard(admin);
    };

    const getComputerMove = async (admin: Account, account: AccountAddress) => {
        try {
            let response = await aptos.view({
            payload: {
                function: `${admin.accountAddress}::RockPaperScissors::get_computer_move`,
                functionArguments: [account],
            },
            });

            setComputerMove(response[0] as any);
        } catch (error: any) {
            console.error("Error get computer move.");
        }
    };

    const getPlayerMove = async (admin: Account, account: AccountAddress) => {
        try {
            let response = await aptos.view({
            payload: {
                function: `${admin.accountAddress}::RockPaperScissors::get_player_move`,
                functionArguments: [account],
            },
            });

            setUserMove(response[0] as any);
        } catch (error: any) {
            console.error("Error get player move.");
        }
    };

    const getGameResult = async (admin: Account, account: AccountAddress) => {
        try {
            let response = await aptos.view({
            payload: {
                function: `${admin.accountAddress}::RockPaperScissors::get_game_results`,
                functionArguments: [account],
            },
            });

            setGameResult(response[0] as any);
        } catch (error: any) {
            console.error("Error get game result.");
        }
    };

    const getGameHistory = async (admin: Account, account: AccountAddress) => {
        try {
            let response = await aptos.view({
            payload: {
                function: `${admin.accountAddress}::RockPaperScissors::get_game_history`,
                functionArguments: [account],
            },
            });

            setGameHistory(response[0] as any);
        } catch (error: any) {
            console.error("Error get game history.");
        }
    };

    const getUserStats = async (admin: Account, account: AccountAddress) => {
        let response;
        try {
            response = await aptos.view({
                payload: {
                    function: `${admin.accountAddress}::RockPaperScissors::get_user_stats`,
                    functionArguments: [account],
                },
            });

            response = response[0];

            let {current_winstreak, games_played, hands_gif, max_winstreak} = response as user_stats;

            setUserStats({
                current_winstreak,
                games_played,
                hands_gif,
                max_winstreak
            });
            setWinstreak(parseInt(current_winstreak));
        } catch (error: any) {
            console.error("Error get user stats.");
        }
    };

    const getLeaderboard = async (admin: Account) => {
        let response;

        try {
            response = await aptos.view({
                payload: {
                    function: `${admin.accountAddress}::RockPaperScissors::get_leaderboard`,
                    functionArguments: [],
                },
            });

            response = response[0];

            if (Array.isArray(response)) {
                const sortedLeaderboard = response.sort((a: any, b: any) => (parseInt(b.max_winstreak) ?? 0) - (parseInt(a.max_winstreak) ?? 0));
                setLeaderboard(sortedLeaderboard);
            } else {
                console.error("Unexpected response format for leaderboard: ", response);
            }
        } catch (error: any) {
            console.error("Error get leaderboard.");
        }
    };

    const transferAPT = async (accountAddress: AccountAddress, recipient: AccountAddress, amount: number) : Promise<string> => {
        const transaction: InputTransactionData = {
            data: {
                function: "0x1::coin::transfer",
                typeArguments: ["0x1::aptos_coin::AptosCoin"],
                functionArguments: [recipient.toStringLong(), amount],
            },
        };

        const loadingMessage = "Please accept transaction in your mobile wallet";

        const id = setLoadingAlertMessage(loadingMessage);

        try {
            const response = await signAndSubmitTransaction(transaction);
            await aptos.waitForTransaction({
                transactionHash: response.hash,
            });
            
            setLoadingUpdateAlertMessage(id, `Transaction Confirmed with hash: ${response.hash}`, "success");
            await fetchBalance(accountAddress);
            return response.hash;
        } catch (error: any) {
            setLoadingUpdateAlertMessage(id, "Transaction failed. Please try again later", "error");
            return "Error";
        }
    };

    const transferAPTBack = async (admin: Account, recipient: AccountAddress, amount: number) : Promise<string> => {
        try {
            const txn = await aptos.transaction.build.simple({
                sender: admin.accountAddress,
                data: {
                function: "0x1::coin::transfer",
                typeArguments: ["0x1::aptos_coin::AptosCoin"],
                functionArguments: [recipient, amount],
                },
            });

            const committedTxn = await aptos.signAndSubmitTransaction({ signer: admin, transaction: txn });

            await aptos.waitForTransaction({ transactionHash: committedTxn.hash });
            setSuccessAlertMessage(`Successful to return your APT with hash ${committedTxn.hash}`)
            return committedTxn.hash;
        } catch (error: any) {
            setErrorAlertMessage(error.message);
            return "Error";
        }
    };

    const handleMint = async (admin: Account, account: AccountAddress, amountToTransfer: number, hand: Hands) : Promise<string> => {
        const loadingMessage = `Please wait. Minting ${hand.name}...`;
        const id = setLoadingAlertMessage(loadingMessage);

        try {
            const txnTransfer = await transferAPT(account, admin.accountAddress, amountToTransfer);
            if (txnTransfer === "Error") {
                setLoadingUpdateAlertMessage(id, "Failed to transfer coin. Please try again later", "error");
                await fetchHands(admin, account, hand.name);
                await fetchBalance(account);
                return "Error";
            }

            const txnMint = await mintHand(id, admin, account, hand);

            if (txnMint === "Error") {
                setLoadingUpdateAlertMessage(id, "Failed to purchase hand. Please try again later", "error");
                const txnTransferBack = transferAPTBack(admin, account, amountToTransfer);
                await fetchHands(admin, account, hand.name);
                await fetchBalance(account);
                return "Error";
            }

            await fetchHands(admin, account, hand.name);
            await fetchBalance(account);

            return txnMint;
        } catch (error: any) {
            setLoadingUpdateAlertMessage(id, "Failed to purchase hand. Please try again later", "error");
            return "Error";
        }
    };

    const mintHand = async (id: any, admin: Account, account: AccountAddress, hand: Hands) : Promise<string> => {
        try {
            const response = await signAndSubmitTransaction({
                sender: account,
                data: {
                    function: `${admin.accountAddress}::main::create_Hand`,
                    typeArguments: [],
                    functionArguments: [
                        hand.name,
                        hand.images,
                        hand.gif,
                    ],
                    },
            });

            await aptos.waitForTransaction({
                transactionHash: response.hash,
            });

            setLoadingUpdateAlertMessage(id, `Successfully purchased ${hand.name}!. With hash ${response.hash}`, "success");

            return response.hash;
        } catch (error: any) {
            return "Error";
        }
    };

    const fetchHands = async (admin: Account, account: AccountAddress, handName: string) => {
        const hasHands = await aptos.view({
            payload: {
                function: `${admin.accountAddress}::main::has_hand`,
                functionArguments: [account, handName],
            },
        });

        if (hasHands) {
            let response;

            try {
                response = await aptos.view({
                payload: {
                    function: `${admin.accountAddress}::main::get_hand`,
                    functionArguments: [account, handName],
                },
                });

                let [name, images, gif] = response;
                const nameString = name as string;
                const newName = nameString.indexOf(handName);

                if (newName !== -1) {
                    nameString.substring(0, newName + handName.length);
                }

                setMyHands((prevHand) => {
                    // Check if Hand with the same name already exists
                    if (prevHand.some(hand => hand.name === nameString)) {
                        return prevHand;
                    }
    
                    return [
                        ...prevHand,
                        {
                            name: nameString,
                            images: images as string[],
                            gif: gif as string,
                            price: 0,
                        }
                    ];
                });
            } catch (error: any) {
                console.error("Hands not found");
            }
        }
    };

    return (
        <ThemeProvider theme={theme}>
        <StyledEngineProvider injectFirst>
        <AppContexts.Provider
        value={{ 
                aptos,
                adminAccount,
                myBalance,
                userMove,
                computerMove,
                gameResult,
                gameHistory,
                winstreak,
                userStats,
                leaderboard,
                myHands,
                setUserMove,
                setComputerMove,
                setGameResult,
                setAdminAccount,
                fetchAdminAccount,
                setMyHands,
                fetchBalance,
                handleStartGame,
                handleViewGame,
                getGameHistory,
                getUserStats,
                getLeaderboard,
                handleMint,
                fetchHands,
            }}>
            {children}
        </AppContexts.Provider>
        </StyledEngineProvider>
        </ThemeProvider>
    )
};

export const AppContext: FC<{ children: ReactNode }> = ({ children }) => {
    return (
        <AlertProvider>
        <AutoConnectProvider>
        <WalletContext>
        <UserContextProvider>
            <AppContextProvider>{children}</AppContextProvider>
        </UserContextProvider>
        </WalletContext>
        </AutoConnectProvider>
        </AlertProvider>
    );
};
