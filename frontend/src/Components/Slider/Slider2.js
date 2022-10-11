/* eslint-disable no-dupe-keys */
/* eslint-disable eqeqeq */
/* eslint-disable no-unused-vars */
import React, { useEffect, useRef, useState } from "react";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import SliderData from "./SliderData";
import SliderJS from "react-slick";
import { GetIndex, ReturnRepeatedData } from "../../utils/Util";
import {
  withdrawAllPaidTokens,
  spinWheel,
  claimWinningItem,
  getClaimStatus,
  getPoolInfo,
  getItemInfos,
  initialize,
  getNFTs,
  getLastUsers,
} from "../../contexts/helpers";

import {
  REWARD_TOKEN_DECIMAL,
  PERCENTAGE_DECIMALS,
  REWARD_TYPE_NFT,
  REWARD_TYPE_TOKEN,
  REWARD_TYPE_SOL
} from "../../contexts/constants";

import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { AiOutlineConsoleSql } from "react-icons/ai";

import Modal from "react-modal";
import { setTokenSourceMapRange } from "typescript";
import Loader from "../Loader/Loader";
import { NotificationManager } from "react-notifications";
import * as anchor from "@project-serum/anchor";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import axios from "axios";
import ReactAudioPlayer from "react-audio-player";
import Running from "../../assets/running.mpeg";
import imgSolana from "../Image/Image/solana.png";


const customStyles = {
  content: {
    top: "50%",
    left: "50%",
    right: "auto",
    bottom: "auto",
    marginRight: "-50%",
    transform: "translate(-50%, -50%)",
  },
};

Modal.setAppElement("#root");

let stopIndex = -1; //10;
let isInitialized = false;

const Slider = (props) => {
  const sliderRef = useRef();
  var audioPlayerRef = useRef();

  const config = {
    className: "center",
    infinite: true,
    centerMode: true,
    // rtl: true,
    // autoplaySpeed: 400,
    arrows: false,
    slidesToShow: 3,
    // : "cubic-bezier(0, 0.1, 0.2, 1)",
    cssEase: "ease-out",
    afterChange: (e) => {
      setCurrentIndex(e);
      setTimeout(() => {
        if (stopIndex != -1) {
          openModal2();
          stopIndex = -1;
        }
      }, 100);
    },
    dots: false,
    infinite: true,
    speed: 300,
    slidesToShow: 5,
    // slidesToScroll: 1,
    centerMode: true,
    centerPadding: "20px",
    responsive: [
      {
        breakpoint: 1400,
        settings: {
          slidesToShow: 4,
          slidesToScroll: 3,
          infinite: true,
          dots: false,
        },
      },
      {
        breakpoint: 1000,
        settings: {
          slidesToShow: 3,
          slidesToScroll: 2,
          initialSlide: 2,
        },
      },
      {
        breakpoint: 680,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 1,
        },
      },
      {
        breakpoint: 480,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
        },
      },
    ],
  };

  let slider;

  // useEffect(() => {

  //   this.slider.slickGoTo(props.jumpItem);

  // }, [props.jumpItem]);

  const { connection } = useConnection();
  const wallet = useWallet();
  const { setVisible } = useWalletModal();

  const [arraytoLoop, setarraytoLoop] = useState(SliderData);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [winnerItem, setWinnerItem] = useState(arraytoLoop[stopIndex]);
  const [adminInitFlag, setAdminInitFlag] = useState(true);
  const [claimEnabled, setClaimEnabled] = useState(false);
  const [dustAmount, setDustAmount] = useState(0);
  const [forgeAmount, setForgeAmount] = useState(0);
  const [paySolAmount, setPaySolAmount] = useState(0);
  const [lastUsers, setLastUsers] = useState([]);

  const tokenSymbolImage = async (tokenMint, tokenType) => {
    if (tokenType == REWARD_TYPE_NFT) {
      try {
        let metaData = await getNFTs(
          connection,
          tokenMint // new PublicKey("DBnoYYwj42y3tVYJfSsnFjtn97qv81CVxxdcexGumZrT")
        );
        let res = await axios.get(metaData.uri);
        if (res.data && res.data.image) {
          return { symbol: res.data.symbol, image: res.data.image };
        }
      } catch (error) {
        console.log("error to get net metadata", error);
      }

      return null;
    } else if (tokenType == REWARD_TYPE_TOKEN) {
      let addrStr = tokenMint.toBase58(); //"BXXkv6z8ykpG1yuvUDPgh732wzVHB69RnB9YgSYh3itW"; // tokenMint.toBase58();
      let apiurl =
        "https://public-api.solscan.io/token/meta?tokenAddress=" + addrStr;
      let res = await axios.get(apiurl);
      if (res.data && res.data.icon) {
        return { symbol: res.data.symbol, image: res.data.icon };
      }
    } else {
      return { symbol: "SOL", image: imgSolana };
    }
  };

  useEffect(() => {
    const func = async () => {
      if (
        wallet &&
        isInitialized == false &&
        isLoading == false
      ) {
        setIsLoading(true);
        if ((await initialize(wallet, connection, true)) == false) {
          // NotificationManager.error("Admin is not initialize")
          setIsLoading(false);
          setAdminInitFlag(false);
          return;
        }

        let sData = await getItemInfos(connection);
        // console.log("client item data", sData);
        var repeatedData = null;
        if (sData) {
          let tmpData = arraytoLoop.slice(0, sData.count);// [...arraytoLoop];
          for (let i = 0; i < sData.count; i++) {
            let symbolImage = await tokenSymbolImage(
              sData.rewardMintList[i].itemMintList[0],
              sData.tokenTypeList[i]
            );
            if (symbolImage) {
              tmpData[i].symbol = symbolImage.symbol;
              if (symbolImage.image) {
                tmpData[i].image = symbolImage.image;
              }
            }
            tmpData[i].percent =
              Number(sData.ratioList[i]) / 10 ** PERCENTAGE_DECIMALS + "%";
            tmpData[i].price =
              "" + sData.amountList[i].toNumber() / 10 ** REWARD_TOKEN_DECIMAL;
            tmpData[i].desc = getDesc(Number(sData.ratioList[i]) / 10 ** PERCENTAGE_DECIMALS, tmpData[i].desc);
          }
          repeatedData = ReturnRepeatedData(tmpData);
        } else {
          repeatedData = []; //ReturnRepeatedData(arraytoLoop);
        }
        setarraytoLoop(repeatedData);

        isInitialized = true;
        setIsLoading(false);
      }
    };
    func();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet]);

  useEffect(() => {
    updateClaimButton();
    updateSettingInfo();
    updateLastUsersInfo();
  }, [wallet]);

  let subtitle;

  const [modalIsOpen, setIsOpen] = React.useState(false);
  const [modalIsOpen2, setIsOpen2] = React.useState(false);
  function openModal() {
    setIsOpen(true);
  }
  function openModal2() {
    setIsOpen2(true);
  }

  function afterOpenModal() {
    // references are now sync'd and can be accessed.
    subtitle.style.color = "#000000";
  }

  const closeModal = async () => {
    setIsOpen(false);
    openModal2();
  };
  const closeModal2 = async () => {
    setIsOpen2(false);
    OnClickClaim();
  };

  const GetIndex = () => {
    var times = 0;
    var i = currentIndex;
    while (times < 6) {
      if (arraytoLoop[i].id && arraytoLoop[i].id == stopIndex) {
        times++;
      }
      i++;
      if (i === 120) {
        i = 0;
      }
    }
    return i - 1;
  };

  const spinTheWheel = async () => {
    var pauseIndex = GetIndex();
    setCurrentIndex(pauseIndex);
    sliderRef.current.slickGoTo(pauseIndex, false);
    try {
      audioPlayerRef.audioEl.current.pause();
    } catch (error) {
      //console.log('audio pause error : ', error);
    }
  };

  const OnClickSpin = async (isPaySol) => {
    if (!wallet || !wallet.connected) {
      setVisible(true);
      return;
    }

    setIsLoading(true);

    const itemIndex = await spinWheel(wallet, connection, isPaySol);
    if (itemIndex < 0) {
      setIsLoading(false);
    } else {
      try {
        audioPlayerRef.audioEl.current.play();
      } catch (error) {
        //console.log('audio playing error : ', error);
      }

      console.log("item index result : ", itemIndex);
      // setStopIndex(itemIndex + 1);
      stopIndex = itemIndex + 1;
      setWinnerItem(arraytoLoop[itemIndex]);
      setIsLoading(false);

      spinTheWheel();
      // openModal();
    }
  };

  const updateLastUsersInfo = async () => {
    let data = await getLastUsers(connection);
    let tmpRes = [];
    for (let i = 0; i < data.count; i++) {
      let user1 = data.userList[i].toBase58();
      let payAmount = data.payAmount[i].toNumber() / (10 ** REWARD_TOKEN_DECIMAL);
      let rAmount = data.rewardAmount[i].toNumber() / (10 ** REWARD_TOKEN_DECIMAL);
      let rMint = data.rewardMint[i];
      let rTokenName = data.rewardType[i] == REWARD_TYPE_SOL ? "$SOL" : "$TOKEN";

      if (data.rewardType[i] != REWARD_TYPE_SOL) {
        let addrStr = rMint.toBase58();
        try {
          let apiurl = "https://public-api.solscan.io/token/meta?tokenAddress=" + addrStr;
          let res = await axios.get(apiurl);
          if (res.data && res.data.symbol) {
            rTokenName = "$" + res.data.symbol;
          }
        } catch (e) {
        }
      }

      let rUser = user1.slice(0, 3) + "..." + user1.slice(-4);
      let rText = rUser + " Spin for " + payAmount + " $SOL and win " + rAmount + " " + rTokenName;

      tmpRes.push(rText);
    }
    setLastUsers(tmpRes);
  }

  const updateSettingInfo = async () => {
    let pool = await getPoolInfo(connection);
    setDustAmount(pool.dustPrice.toNumber() / (10 ** REWARD_TOKEN_DECIMAL));
    setForgeAmount(pool.forgePrice.toNumber() / (10 ** REWARD_TOKEN_DECIMAL));
    setPaySolAmount(pool.solPrice.toNumber() / LAMPORTS_PER_SOL);
  }

  const updateClaimButton = async () => {
    let claimStatus = await getClaimStatus(wallet, connection);
    setClaimEnabled(claimStatus);
  };

  const OnClickClaim = async () => {
    setIsLoading(true);
    try {
      await claimWinningItem(wallet, connection);
    } catch (error) {
      console.log("claim error", error);
    }
    setIsLoading(false);

    updateClaimButton();
    updateLastUsersInfo();
  };

  const getDesc = (percentage, defaultDesc) => {
    let desc = defaultDesc;
    if (percentage < 0.1) {
      desc = "EPIC";
    } else if (percentage < 1) {
      desc = "RARE";
    } else if (percentage < 5) {
      desc = "LUCKY";
    } else {
      desc = "COMMON";
    }

    return desc;
  }

  return (
    <div className="container" style={{ marginTop: "50px" }}>
      {!adminInitFlag && (
        <div>
          <Modal
            isOpen={true}
            style={customStyles}
            contentLabel="Admin Init Confirm"
          >
            <h2 ref={(_subtitle) => (subtitle = _subtitle)}>
              Admin didn't initialize.
            </h2>
          </Modal>
        </div>
      )}
      {isLoading && <Loader />}
      <div>
        <Modal
          isOpen={modalIsOpen}
          onAfterOpen={afterOpenModal}
          onRequestClose={closeModal}
          style={customStyles}
          contentLabel="Example Modal"
        >
          <h2 ref={(_subtitle) => (subtitle = _subtitle)}>You've won</h2>
          <h3>{winnerItem && winnerItem.price} </h3>
          {/* <img src={OpenBox} alt="" /> */}
        </Modal>
        <Modal
          isOpen={modalIsOpen2}
          onAfterOpen={afterOpenModal}
          onRequestClose={closeModal2}
          style={customStyles}
          contentLabel="Example Modal"
        >
          <h2 ref={(_subtitle) => (subtitle = _subtitle)}>You've won</h2>
          <h3>{winnerItem && winnerItem.price} </h3>
          <img src={winnerItem && winnerItem.image} style={{ maxWidth: "300px" }} alt="" />
        </Modal>
      </div>
      <SliderJS {...config} ref={sliderRef}>
        {arraytoLoop &&
          arraytoLoop.map((val, ind) => {
            return (
              <div className="slider" key={ind}>
                <div className="slider_box_content">
                  <div className="slider_box_container">
                    <div className="percent_and_desc_box">
                      <div className="percent">{val.percent}</div>
                      <div className="desc">{val.desc}</div>
                    </div>
                    <img className="slider_img" src={val.image} alt="" />
                    <div className="price">
                      <p>
                        {val.price} <small>{val.symbol}</small>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
      </SliderJS>
      <ReactAudioPlayer
        ref={(el) => {
          audioPlayerRef = el;
        }}
        src={Running}
        loop={isLoading}
      />
      {/* <div className="box-container">
        <img src={Box} alt="" className="" />
      </div> */}
      <div className="detail">
        {/* <div onClick={() => OnClickSpin(false)}>Open Box({dustAmount} Token)</div> */}
        <div onClick={() => OnClickSpin(true)} style={{ marginLeft: "16px" }}>Open Box({paySolAmount} SOL)</div>
        {
          claimEnabled && (
            <div onClick={() => OnClickClaim()} style={{ marginLeft: "16px" }}>Claim</div>
          )
        }
      </div>
      <div style={{ textAlign: "center" }}>
        {
          lastUsers.map(txt => <div>{txt}</div>)
        }
      </div>
    </div>
  );
};

export default Slider;
