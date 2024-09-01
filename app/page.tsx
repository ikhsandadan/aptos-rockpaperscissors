"use client";
import { usePathname } from 'next/navigation';
import Homepage from '../app/HomePage/page';
import Leaderboard from './Leaderboard/page';

export default function Home() {
  const pathName = usePathname();
  return (
    <>
      {pathName === '/' && <Homepage />}
      {pathName === '/Leaderboard' && <Leaderboard />}
    </>
  );
};