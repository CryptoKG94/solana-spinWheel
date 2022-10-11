/* eslint-disable no-dupe-keys */
/* eslint-disable eqeqeq */
/* eslint-disable no-unused-vars */
import React, { useEffect, useRef, useState } from "react";
import RoulettePro from "react-roulette-pro";
import "react-roulette-pro/dist/index.css";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import SliderData from "./SliderData";
import SliderJS from "react-slick";
import { GetIndex, ReturnRepeatedData } from "../../utils/Util";
import {
  withdrawAllPaidTokens,
  spinWheel,
  getItemInfos,
  initialize,
  getNFTs,
  REWARD_TOKEN_DECIMAL,
} from "../../contexts/helpers";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { AiOutlineConsoleSql } from "react-icons/ai";

import Modal from "react-modal";
import { setTokenSourceMapRange } from "typescript";
import Loader from "../Loader/Loader";
import { NotificationManager } from "react-notifications";
import * as anchor from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import axios from "axios";
import ReactAudioPlayer from "react-audio-player";
import Running from "../../assets/running.mpeg";
import Stopped from "../../assets/open.mpeg";
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
  const [start, setStart] = useState(false);
  const sliderRef = useRef();
  var audioPlayerRef = useRef();

  const config = {
    className: "center",
    infinite: true,
    centerMode: true,
    // rtl: true,
    // autoplaySpeed: 400,
    speed: 10000,
    arrow: false,
    slidesToShow: 3,
    easing: "cubic-bezier(0, 0.1, 0.2, 1)",
    afterChange: (e) => {
      setCurrentIndex(e);
      setTimeout(() => {
        if (stopIndex != -1) {
          openModal();
          stopIndex = -1;
        }
      }, 100);
    },
    dots: false,
    infinite: true,

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

  const [arraytoLoop, setarraytoLoop] = useState(SliderData);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [winnerItem, setWinnerItem] = useState(arraytoLoop[stopIndex]);
  const [adminInitFlag, setAdminInitFlag] = useState(true);

  const tokenSymbolImage = async (tokenMint, tokenType) => {
    if (tokenType == 1) {
      let metaData = await getNFTs(
        connection,
        tokenMint // new PublicKey("DBnoYYwj42y3tVYJfSsnFjtn97qv81CVxxdcexGumZrT")
      );
      let res = await axios.get(metaData.uri);
      if (res.data && res.data.image) {
        return { symbol: res.data.symbol, image: res.data.image };
      }
      return "";
    } else {
      let addrStr = tokenMint.toBase58(); // "BXXkv6z8ykpG1yuvUDPgh732wzVHB69RnB9YgSYh3itW"; // tokenMint.toBase58();
      let apiurl =
        "https://public-api.solscan.io/token/meta?tokenAddress=" + addrStr;
      let res = await axios.get(apiurl);
      if (res.data && res.data.icon) {
        //console.log('111111111111', res.data)
        return { symbol: res.data.symbol, image: res.data.icon };
      }
    }
  };

  useEffect(() => {
    const func = async () => {
      if (
        wallet.wallet &&
        wallet.publicKey &&
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
        //console.log("client item data", sData);
        var repeatedData = null;
        if (sData) {
          let tmpData = [...arraytoLoop];
          for (let i = 0; i < sData.ratioList.length; i++) {
            let symbolImage = await tokenSymbolImage(
              sData.rewardMintList[i].itemMintList[0],
              sData.tokenTypeList[i]
            );
            if (symbolImage) {
              tmpData[i].symbol = symbolImage.symbol;
              tmpData[i].image = symbolImage.image;
              tmpData[i].percent = sData.ratioList[i] + "%";
              tmpData[i].price =
                "" +
                sData.amountList[i].toNumber() / 10 ** REWARD_TOKEN_DECIMAL;
            }
          }
          repeatedData = ReturnRepeatedData(tmpData);
        } else {
          repeatedData = ReturnRepeatedData(arraytoLoop);
        }
        setarraytoLoop(repeatedData);

        isInitialized = true;
        setIsLoading(false);
      }
    };
    func();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet]);

  let subtitle;

  const [modalIsOpen, setIsOpen] = React.useState(false);
  function openModal() {
    setIsOpen(true);
  }

  function afterOpenModal() {
    // references are now sync'd and can be accessed.
    subtitle.style.color = "#000000";
  }

  function closeModal() {
    setIsOpen(false);
    // spinTheWheel();
  }

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
      audioPlayerRef.audioEl.current.play();
    } catch (error) {
      //console.log('audio pause error : ', error);
    }
  };

  const OnClickSpin = async (paySol) => {
    setIsLoading(true);

    const itemIndex = await spinWheel(wallet, connection, paySol);
    if (itemIndex < 0) {
      setIsLoading(false);
      if (itemIndex == -1) {
        // rejected & error
        NotificationManager.error(
          "Transaction error",
          "Please check your network and balanceof wallet",
          3000
        );
      }
    } else {
      try {
        audioPlayerRef.audioEl.current.play();
      } catch (error) {
        //console.log('audio playing error : ', error);
      }

      //console.log("item index result : ", itemIndex + 1);
      // setStopIndex(itemIndex + 1);
      stopIndex = itemIndex + 1;
      setWinnerItem(arraytoLoop[itemIndex]);
      setIsLoading(false);

      spinTheWheel();
    }
  };
  const reproductionArray = (array = [], length = 0) => [
    ...Array(length)
      .fill("_")
      .map(() => array[Math.floor(Math.random() * array.length)]),
  ];
  const prizeList = [
    ...arraytoLoop,
    ...reproductionArray(arraytoLoop, arraytoLoop.length * 3),
    ...arraytoLoop,
    ...reproductionArray(arraytoLoop, arraytoLoop.length),
  ];
  const handleStart = () => {
    setStart((prevState) => !prevState);
  };

  const handlePrizeDefined = (value) => {
    console.log(value);
    console.log("🥳 Prize defined! 🥳");
  };
  const prizeIndex = arraytoLoop.length * 4 + 2;
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
          <img src={winnerItem && winnerItem.image} alt="" />
        </Modal>
      </div>
      <RoulettePro
        prizes={prizeList}
        prizeIndex={prizeIndex}
        spinningTime={50}
        start={start}
        onPrizeDefined={handlePrizeDefined}
        prizeItemRenderFunction={(item, index, designOptions) => (
          <div className="slider" key={index} style={{ maxWidth: 200 }}>
            <div className="slider_box_content">
              <div className="slider_box_container">
                <div className="percent_and_desc_box">
                  <div className="percent">{item.percent}</div>
                  <div className="desc">{item.desc}</div>
                </div>
                <img className="slider_img" src={item.image} alt="" />
                <div className="price">
                  <p>
                    {item.price} <small>{item.symbol}</small>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      />
      {/* <SliderJS {...config} ref={sliderRef}>
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
      /> */}

      <div className="detail">
        {/* <p onClick={spinTheWheel}>Try for free</p> */}
        {/* <button onClick={() => OnClickSpin(true)}>Open Box(1 SOL)</button> */}
        <div onClick={handleStart}>Open Box(1.5 Token)</div>
      </div>
    </div>
  );
};

export default Slider;
