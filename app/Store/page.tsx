"use client";
import { FC, useEffect, useState } from 'react';

import Style from './store.module.css';
import { useAppContext } from '../context/AppContext';
import { useUserContext } from '../context/UserContext';
import { hands } from '../utils/hands';
import { Hands } from '../Hands';
import Image from 'next/image';

const Store: FC = () => {
    const { adminAccount, myHands, handleMint } = useAppContext();
    const { userAddress } = useUserContext();

    const handleBuyHand = async (hand: Hands) => {
        if (hand.price < 1 || myHands.some(myHand => myHand.name === hand.name)) {
            return;
        }

        if (adminAccount && userAddress) {
            await handleMint(adminAccount, userAddress, hand.price, hand);
        }
    };

    return (
        <div style={{minHeight: '75vh'}} className='w-full sm:p-14 p-5 text-white flex flex-col mt-14'>
            <h1 className='w-full text-center text-4xl mb-8'>Store</h1>
            <div className={`${Style.NFTCard} flex flex-row flex-wrap gap-6 items-center justify-center`}>
                {hands.map((hand: Hands, i: number) => (
                    <div className={Style.NFTCard_box} key={i} onClick={() => handleBuyHand(hand)}>
                        <div className={Style.NFTCard_box_img}>
                            <Image src={hand.gif} alt="Hand images" width={256} height={256} className={Style.NFTCard_box_img_img} />
                        </div>

                        <div className={Style.NFTCard_box_update}>
                            <div className={Style.NFTCard_box_update_left}>
                                <div className={Style.NFTCard_box_update_left_price}>
                                    {myHands.some(myHand => myHand.name === hand.name) || hand.price < 1 ? <p>Owned</p> : <p>{hand.price / 100000000} APT</p>}
                                </div>
                            </div>

                            <div className={Style.NFTCard_box_update_right}>
                                <div className={Style.NFTCard_box_update_right_info}>
                                    <p>{hand.name}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Store;