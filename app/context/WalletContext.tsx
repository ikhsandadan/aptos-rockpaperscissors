"use client";
import { useAutoConnect } from "../provider/AutoConnectProvider";
import { FewchaWallet } from "fewcha-plugin-wallet-adapter";
import { MartianWallet } from "@martianwallet/aptos-wallet-adapter";
import { PetraWallet } from "petra-plugin-wallet-adapter";
import { PontemWallet } from "@pontem/wallet-adapter-plugin";
import { TrustWallet } from "@trustwallet/aptos-wallet-adapter";
import { MSafeWalletAdapter } from "@msafe/aptos-wallet-adapter";
import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import { IdentityConnectWallet } from "@identity-connect/wallet-adapter-plugin";
import { Network } from "@aptos-labs/ts-sdk";
import { FC, ReactNode, useState, useContext, createContext } from "react";

import { useAlert } from "../provider/AlertProvider";

interface WalletContextState {
    isLoading: boolean;
};

export const WalletContexts = createContext<WalletContextState | undefined>(
    undefined
);

export function useWalletContext(): WalletContextState {
    const context = useContext(WalletContexts);
    if (!context)
        throw new Error("useWalletContext must be used within an WalletContextProvider");
    return context;
};

const WalletContextProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const { autoConnect } = useAutoConnect();
    const { setErrorAlertMessage } = useAlert();

    const wallets = [
        new IdentityConnectWallet("57fa42a9-29c6-4f1e-939c-4eefa36d9ff5", {
            networkName: Network.TESTNET,
        }),
        new FewchaWallet(),
        new MartianWallet(),
        new MSafeWalletAdapter(),
        new PetraWallet(),
        new PontemWallet(),
        new TrustWallet(),
    ];

    return (
        <AptosWalletAdapterProvider
            plugins={wallets}
            autoConnect={autoConnect}
            onError={(error) => {
                setErrorAlertMessage(error);
            }}
            dappConfig={{ network: Network.TESTNET, aptosConnectDappId: "dapp-id" }}
        >
            {children}
        </AptosWalletAdapterProvider>
    );
};

export const WalletContext: FC<{ children: ReactNode }> = ({ children }) => {
    return (
        <WalletContextProvider>
            {children}
        </WalletContextProvider>
    );
};