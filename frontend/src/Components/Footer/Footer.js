import React from 'react'
import load from '../Image/load.png'
// import { useWallet } from "@solana/wallet-adapter-react";
import { spinWheel } from "../../contexts/helpers";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { BsHeartFill } from "react-icons/bs";


const Footer = (props) => {
  const { connection } = useConnection();
  const wallet = useWallet();

  const OnClickSpin = async () => {
    // const wallet = window["curWallet"];
    const res = spinWheel(wallet, connection);
    // props.onEndSpin(res);
  }

  return (
    <div className="container footer">
      {/* <img src={load} alt="" /> */}
      <div className="detail">
        <p>Design with <span className='icons'><BsHeartFill /></span> by 2X Solution</p>
        {/* <button onClick={OnClickSpin}>Open Box</button> */}
      </div>
    </div>
  )
}

export default Footer