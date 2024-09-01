"use client";
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Confetti from 'react-confetti';
import Modal from '@mui/material/Modal';
import Box from '@mui/material/Box';
import { IconButton } from '@mui/material';

import { useUserContext } from '../context/UserContext';
import { useAppContext } from '../context/AppContext';
import { hands } from '../utils/hands';
import { Hands } from '../Hands';

const style = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    p: 4,
    bgcolor: 'primary.main',
    border: '2px solid #ffff',
    boxShadow: 24,
    borderRadius: 2,
};

const HomePage = () => {
    const { userAddress } = useUserContext();
    const { 
        adminAccount, 
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
        handleStartGame, 
        handleViewGame,
        getGameHistory,
        getUserStats,
        getLeaderboard
    } = useAppContext();
    const [begin, setBegin] = useState<boolean>(false);
    const [openModal, setOpenModal] = useState<boolean>(false);
    const [result , setResult] = useState<string>('');
    const [isExploding, setIsExploding] = useState<boolean>(false);
    const [choosenHand, setChoosenHand] = useState<Hands>();

    const handleStartGameButton = async (hand: Hands) => {
        setChoosenHand(hand);
        setBegin(true);
    };

    const handleEndGameButton = async () => {
        setUserMove(0);
        setComputerMove(0);
        setGameResult(0);
        setBegin(false);
    };

    const handlePlayAgainButton = async () => {
        setUserMove(0);
        setComputerMove(0);
        setGameResult(0);
    };

    const handleClose = () => {
        setOpenModal(false);
        setResult('');
        setIsExploding(false);
    };

    const startGame = async (playerMove: number, handsGif: string) => {
        if (adminAccount && userAddress) {
            await handleStartGame(adminAccount, userAddress, playerMove, handsGif);
            await handleViewGame(adminAccount, userAddress);
        }
    };

    useEffect(() => {
        console.log("Leaderboard: ", leaderboard);
    }, [leaderboard]);

    useEffect(() => {
        if (gameResult === 2) {
            setResult('You Win!');
            setIsExploding(true);
            setOpenModal(true);
        } else if (gameResult === 1) {
            setResult('Tie!');
            setOpenModal(true);
        } else if (gameResult === 3) {
            setResult('You Lose!');
            setOpenModal(true);
        }
    }, [gameResult]);

    useEffect(() => {
        if (adminAccount && userAddress) {
            getGameHistory(adminAccount, userAddress);
            getUserStats(adminAccount, userAddress);
            getLeaderboard(adminAccount);
        }
    }, [adminAccount, userAddress]);

    return (
        <div style={{minHeight: '75vh'}} className='flex flex-col gap-4 items-center justify-center mt-20'>
            {userAddress ? (
                <div className='w-full flex flex-col items-center'>
                    {isExploding && (
                        <Confetti />
                    )}
                    {begin ? (
                        <div className='flex flex-col items-center gap-6 max-w-max'>
                            <div className='flex flex-col gap-24 items-center'>
                                <div className='flex flex-col justify-center items-center gap-4'>
                                    <h1 className='w-full text-center text-3xl'>Computer Move:</h1>
                                    {computerMove === 0 ? (
                                        <div className='flex flex-row'>
                                            <Image alt="image" src={hands[0].gif} width={100} height={100} />
                                        </div>
                                    ) : (
                                        <div className='flex flex-row'>
                                            <Image alt="image" src={hands[0].images[computerMove - 1]} width={100} height={100} />
                                        </div>
                                    )}
                                </div>

                                <div className='flex flex-col justify-center items-center gap-4'>
                                    {userMove === 0 ? (
                                        <div className='flex flex-col justify-center items-center gap-4'>
                                            <h1 className='w-full text-center text-3xl'>Choose Your Move:</h1>
                                            <div className='flex flex-row gap-6'>
                                                {choosenHand?.images.map((hand, index) => (
                                                    <div key={index} onClick={() => { startGame(index + 1, choosenHand?.gif); }} className='cursor-pointer p-4 rounded-lg border border-white hover:scale-105 hover:shadow-[0_0_10px_#25fff2] transition duration-300'>
                                                        <Image alt="image" src={hand} width={100} height={100} />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className='flex flex-col justify-center items-center gap-4'>
                                            <h1 className='w-full text-center text-3xl'>Your Move:</h1>
                                            <div className='flex flex-row'>
                                                <Image alt="image" src={choosenHand?.images[userMove - 1] as string} width={100} height={100} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {winstreak && winstreak > 0 ? (
                                <div className='flex flex-row items-center gap-4'>
                                    <h1 className='w-full text-center text-3xl'>Win Streak: {winstreak}</h1>
                                </div>
                            ) : (null)}

                            {userMove !== 0 && computerMove !== 0 ? (
                                <div className='flex flex-row items-center gap-4'>
                                    <button onClick={handleEndGameButton} className='max-w-48 bg-white rounded-md px-4 py-2 mt-4 text-black hover:bg-transparent hover:text-white hover:border hover:border-white'>Back To Home</button>
                                    <button onClick={handlePlayAgainButton} className='max-w-48 bg-white rounded-md px-4 py-2 mt-4 text-black hover:bg-transparent hover:text-white hover:border hover:border-white'>Play Again</button>
                                </div>
                            ) : (
                                <button onClick={handleEndGameButton} className='max-w-48 bg-white rounded-md px-4 py-2 mt-4 text-black hover:bg-transparent hover:text-white hover:border hover:border-white'>Back To Home</button>
                            )}
                        </div>
                    ) : (
                        <div className='max-w-max max-h-max flex flex-col items-center gap-4'>
                            <h1 className='w-full text-center text-3xl mt-8'>Welcome to Rock Paper Scissors Games</h1>
                            <h1 className='w-full text-center text-2xl mt-6'>Choose your hand</h1>
                            <h2 className='w-full text-2xl text-center'>Free Hand</h2>
                                    <div className='grid grid-flow-col auto-cols-auto gap-6 justify-center p-4'>
                                        <IconButton onClick={() => handleStartGameButton(hands[0])}>
                                            <div className='rounded-md bg-transparent hover:scale-150 hover:shadow-[0_0_10px_#25fff2] hover:m-4 transition duration-500'>
                                                <Image src={hands[0].gif} alt="Hand images" width={100} height={100} className='hover:scale-x-105'/>
                                            </div>
                                        </IconButton>
                                    </div>

                                    {myHands.length > 0 ? (
                                        <>
                                        <h2 className='w-full text-2xl text-center mt-4'>Purchased Hands</h2>
                                        <div className='grid grid-flow-col auto-cols-auto gap-6 justify-center p-4'>
                                            {myHands.map((myHand: any, index: number) => (
                                                <IconButton onClick={() => handleStartGameButton(myHand)} key={index}>
                                                    <div className='rounded-md bg-transparent hover:scale-150 hover:shadow-[0_0_10px_#25fff2] hover:m-4 transition duration-500'>
                                                        <Image src={myHand.gif} alt="Hand images" width={100} height={100} className='hover:scale-x-105'/>
                                                    </div>
                                                </IconButton>
                                            ))}
                                        </div>
                                        </>
                                    ) : (null)}
                        </div>
                    )}
                </div>
            ) : (
                <h1 className='w-full text-center text-3xl'>Please connect your wallet</h1>
            )}

            <Modal
                open={openModal}
                onClose={handleClose}
                aria-labelledby="parent-modal-title"
                aria-describedby="parent-modal-description"
                >
                <Box sx={style}>
                    <div className="flex flex-col items-center p-2 max-w-xl">
                        <div className="text-3xl font-bold text-white">{result}</div>
                    </div>
                </Box>
            </Modal>
        </div>
    )
};

export default HomePage;