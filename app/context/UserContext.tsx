"use client";
import {
    useWallet
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

interface UserContextState {
    fetchUserAddress: () => any;
    userAddress: AccountAddress | undefined;
    setUserAddress: (userData: AccountAddress | undefined) => void;
};

export const UserContext = createContext<UserContextState | undefined>(
    undefined
);

export function useUserContext(): UserContextState {
    const context = useContext(UserContext);
    if (!context)
        throw new Error("useUserContext must be used within an UserContextProvider");
    return context;
};

export const UserContextProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const { account } = useWallet();
    const [userAddress, setUserAddress] = useState<AccountAddress | undefined>(undefined);

    const fetchUserAddress = async () => {
        if (account) {
            const aptosAccount = await AccountAddress.from(account.address);
            setUserAddress(aptosAccount);
        }
    };

    return (
        <UserContext.Provider value={{ fetchUserAddress, userAddress, setUserAddress }}>
            {children}
        </UserContext.Provider>
    );
};