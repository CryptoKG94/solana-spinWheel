/* eslint-disable eqeqeq */
import React, { useEffect, useState } from "react";
import "./admin.css";
import {
  initialize,
  setAdminInfos,
  isAdminWallet,
  getAdminList,
  setPayInfo,
  getPoolInfo,
  addAdmin,
  deleteAdmin,
  sendToContract,
} from "../../contexts/helpers";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { NotificationManager } from "react-notifications";
import { withdrawAllPaidTokens, getItemInfos } from "../../contexts/helpers";

import {
  REWARD_TOKEN_DECIMAL,
  PERCENTAGE_DECIMALS,
  USDC_TOKEN_MINT,
  REWARD_TYPE_NFT,
  REWARD_TYPE_TOKEN,
  REWARD_TYPE_SOL,
} from "../../contexts/constants";


import Modal from "react-modal";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
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

let isInitialized = false;
let isInitializing = false;

function Admin() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const REWARD_TOKEN_COUNT_PER_ITEM = 10;
  const MAX_ITEM_COUNT = 15;

  const [isAdmin, setAdmin] = useState(0);  // 0: super admin, 1 : admin, 2 : client

  const [isLoaded, setLoaded] = useState(false);

  const [settingModalIsOpen, setSettingModalIsOpen] = useState(false);
  const [transferModalIsOpen, setTransferModalIsOpen] = useState(false);
  const [transferTokenAddr, setTransferTokenAddr] = useState("");
  const [transferAmount, setTransferAmount] = useState(0);

  const [dustAddr, setDustAddr] = useState(USDC_TOKEN_MINT.toBase58());
  const [forgeAddr, setForgeAddr] = useState(USDC_TOKEN_MINT.toBase58());
  const [dustAmount, setDustAmount] = useState(0);
  const [forgeAmount, setForgeAmount] = useState(0);
  const [devFee, setDevFee] = useState(0);
  const [devWallet, setDevWallet] = useState("");
  const [paymentSolAmount, setPaymentSolAmount] = useState(0);

  const [superAdminModalIsOpen, setSuperAdminModalIsOpen] = useState(false);
  const [adminList, setAdminList] = useState([]);
  const [newAdminAddr, setNewAdminAddr] = useState("");

  const [rows, setRows] = useState([
    {
      price: "",
      walletAddress: "",
      winningPercentage: "",
      type: "nft",
    },
  ]);

  useEffect(() => {
    const asyncGetItemInfos = async () => {
      setLoaded(false);

      if (wallet.publicKey && isInitializing == false) {
        isInitializing = true;
        if (await initialize(wallet, connection, true) == false) {
          isInitializing = false;
          NotificationManager.error('Not Initialized');
          return;
        }

        let adminAddrCheck = await isAdminWallet(wallet);
        setAdmin(adminAddrCheck);
        if (adminAddrCheck == 2) {
          isInitializing = false;
          return;
        } else if (adminAddrCheck == 0) {
          await updateAdminList();
        }

        let sData = null;
        try {
          sData = await getItemInfos();
        } catch (error) {
          //console.log("error to getItemInfos from admin", error);
        }

        let tmpRows = [];
        if (sData) {
          for (let i = 0; i < sData.count; i++) {
            let tmpPrice = sData.amountList[i].toNumber() / (10 ** REWARD_TOKEN_DECIMAL);
            let tmpRatio = Number(sData.ratioList[i]) / (10 ** PERCENTAGE_DECIMALS);
            let row = {
              price: "" + tmpPrice,
              winningPercentage: "" + tmpRatio, //sData.ratioList[i],
              type: sData.tokenTypeList[i] == REWARD_TYPE_NFT ? "nft" : sData.tokenTypeList[i] == REWARD_TYPE_SOL ? "sol" : "token",
            };

            let tokenList = sData.rewardMintList[i];
            let walletAddress = "";
            for (let k = 0; k < tokenList.count; k++) {
              walletAddress += tokenList.itemMintList[k].toBase58();
              if (k != tokenList.count - 1) {
                walletAddress += ",";
              }
            }
            row.walletAddress = walletAddress;
            tmpRows.push(row);
          }
          if (tmpRows.length != 0) {
            setRows(tmpRows);
          }
        }

        await updateSettingInfo();

        setLoaded(true);
        isInitialized = true;
        isInitializing = false;
      }
    };

    if (isInitialized == false) {
      asyncGetItemInfos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet]);

  const updateAdminList = async () => {
    let tmpList = await getAdminList();
    setAdminList(tmpList);
  }

  const updateSettingInfo = async () => {
    try {
      let sData = await getPoolInfo(connection);
      if (sData) {
        setDustAddr(sData.dustMint.toBase58());
        setForgeAddr(sData.forgeMint.toBase58());
        let pay_amount = sData.dustPrice.toNumber() / (10 ** REWARD_TOKEN_DECIMAL);
        setDustAmount(pay_amount);

        pay_amount = sData.forgePrice.toNumber() / (10 ** REWARD_TOKEN_DECIMAL);
        setForgeAmount(pay_amount);

        pay_amount = sData.solPrice.toNumber() / LAMPORTS_PER_SOL;
        setPaymentSolAmount(pay_amount);

        let dev_fee = sData.devFee.toNumber();
        setDevFee(dev_fee);

        let dev_wallet = sData.devWallet.toBase58();
        setDevWallet(dev_wallet);

      }
    } catch (error) {

    }
  }

  const onWithdraw = async (isForPayTokens) => {
    await withdrawAllPaidTokens(wallet, connection, isForPayTokens);
    return;
  };

  const OnChange = (e, index) => {
    setRows((prev) =>
      Object.values({
        ...prev,
        [index]: { ...prev[index], [e.target.name]: e.target.value },
      })
    );
  };

  const AddRow = () => {
    if (rows.length < MAX_ITEM_COUNT) {
      setRows((prev) => [
        ...prev,
        {
          price: "",
          walletAddress: "",
          winningPercentage: "",
          type: "nft",
        },
      ]);
    } else {
      NotificationManager.warning("max count is 15.");
    }
  };

  const RemoveRow = (index) => {
    if (rows.length > 1) {
      var rowsTemp = [...rows];
      rowsTemp.splice(index, 1);
      setRows(rowsTemp);
    }
  };

  const onSetRows = async (e) => {

    if (rows.length > MAX_ITEM_COUNT) {
      NotificationManager.error("Item count should be less than 15", 3000);
      return;
    }

    let itemInfos = [];
    let totalPercent = 0;
    for (let i = 0; i < rows.length; i++) {
      let strAddrList = rows[i].walletAddress.split(",");
      let addrCnt = strAddrList.length;
      if (addrCnt > REWARD_TOKEN_COUNT_PER_ITEM) {
        addrCnt = REWARD_TOKEN_COUNT_PER_ITEM;
        let msgTitle = i + 1 + " item's token count is over flow";
        let msgCont =
          "Max Token Count is " + REWARD_TOKEN_COUNT_PER_ITEM + ". ";
        NotificationManager.warning(msgTitle, msgCont, 3000);
      }
      let tokenAddrList = [];
      for (let k = 0; k < addrCnt; k++) {
        let addr = strAddrList[k].trim();
        tokenAddrList.push(addr);
      }
      itemInfos.push({
        tokenAddrList: tokenAddrList,
        tokenType: rows[i].type == "nft" ? REWARD_TYPE_NFT : rows[i].type == "sol" ? REWARD_TYPE_SOL : REWARD_TYPE_TOKEN,
        price: Number(rows[i].price),
        winningPercentage: Number(rows[i].winningPercentage),
      });

      totalPercent += Number(rows[i].winningPercentage);
    }
    if (totalPercent != 100) {
      NotificationManager.error("Total percentage must be 100");
      return;
    }

    // for (let i = 0; i < 15; i++) {
    //   itemInfos.push({
    //     tokenAddrList: ['FNY5Bb9bsYc2cJCrXt28WtjqgxFbEk5Gsc4cvHzUtHXd'],
    //     tokenType: 1,
    //     price: i,
    //     winningPercentage: i == 14 ? 2 : 7,
    //   });
    // }

    setAdminInfos(wallet, connection, itemInfos);
  };

  function openSuperAdminModal() {
    setSuperAdminModalIsOpen(true);
  }

  function afterOpenSuperAdminModal() {
    // references are now sync'd and can be accessed.
    // subtitle.style.color = "#000000";
  }

  const closeSuperAdminModal = async () => {
    setSuperAdminModalIsOpen(false);
  }

  function openSettingModal() {
    setSettingModalIsOpen(true);
  }

  function afterOpenModal() {
    // references are now sync'd and can be accessed.
    // subtitle.style.color = "#000000";
  }

  const closeModal = async () => {
    setSettingModalIsOpen(false);
  }

  const onSettingInfo = async () => {
    let dustKey = new PublicKey(dustAddr);
    let forgeKey = new PublicKey(forgeAddr);
    if (dustKey.equals(PublicKey.default)) {
      NotificationManager.info("Please correct dust key", 3000);
      return;
    }
    if (forgeKey.equals(PublicKey.default)) {
      NotificationManager.info("Please correct forge key", 3000);
      return;
    }
    
    await setPayInfo(wallet, connection, dustKey, forgeKey, paymentSolAmount, dustAmount, forgeAmount, devFee, devWallet);
    await updateSettingInfo();
    await closeModal();
  }

  const onAddAdmin = async (adminAddr) => {
    try {
      await addAdmin(wallet, connection, adminAddr);
      await updateAdminList();
      setNewAdminAddr("");
    } catch (error) {
      console.log('add admin error', error);
    }
  }

  const onRemoveAdmin = async (adminAddr) => {
    try {
      await deleteAdmin(wallet, connection, adminAddr);
      await updateAdminList();
    } catch (error) {
      console.log('delete admin error', error);
    }
  }

  const onSendToken = async () => {
    sendToContract(wallet, connection, transferTokenAddr, Number(transferAmount));
  }

  return isAdmin == 2 ? (
    <h1>No Admin</h1>
  ) : !isLoaded ? (
    <div>
      <h1>Loading...</h1>
    </div>
  ) : (
    <div className="admin">
      <Modal
        isOpen={settingModalIsOpen}
        onAfterOpen={afterOpenModal}
        onRequestClose={closeModal}
        style={customStyles}
        contentLabel="Setting Modal"
      >
        <h2 >Setting Dialog</h2>

        <div className="input-group">
          <label htmlFor="">Dust Token Address</label>
          <input
            onChange={(e) => setDustAddr(e.target.value)}
            name="walletAddress"
            type="text"
            className="custom-input"
            placeholder="Address"
            value={dustAddr}
          />
        </div>

        <div className="input-group">
          <label htmlFor="">Forge Token Address</label>
          <input
            onChange={(e) => setForgeAddr(e.target.value)}
            name="walletAddress"
            type="text"
            className="custom-input"
            placeholder="Address"
            value={forgeAddr}
          />
        </div>

        <div className="input-group">
          <label htmlFor="">SOL Amount</label>
          <input
            onChange={(e) => setPaymentSolAmount(e.target.value)}
            name="walletAddress"
            type="text"
            className="custom-input"
            placeholder="Amount"
            value={paymentSolAmount}
          />
        </div>

        <div className="input-group">
          <label htmlFor="">Dust Amount</label>
          <input
            onChange={(e) => setDustAmount(e.target.value)}
            name="walletAddress"
            type="text"
            className="custom-input"
            placeholder="Amount"
            value={dustAmount}
          />
        </div>

        <div className="input-group">
          <label htmlFor="">Forge Amount</label>
          <input
            onChange={(e) => setForgeAmount(e.target.value)}
            name="walletAddress"
            type="text"
            className="custom-input"
            placeholder="Amount"
            value={forgeAmount}
          />
        </div>

        {
          isAdmin == 0 && (
            <>
              <div className="input-group">
                <label htmlFor="">Dev Wallet</label>
                <input
                  onChange={(e) => setDevWallet(e.target.value)}
                  name="walletAddress"
                  type="text"
                  className="custom-input"
                  placeholder="Address"
                  value={devWallet}
                />
              </div>

              <div className="input-group">
                <label htmlFor="">Dev Fee</label>
                <input
                  onChange={(e) => setDevFee(e.target.value)}
                  name="walletAddress"
                  type="text"
                  className="custom-input"
                  placeholder="Amount"
                  value={devFee}
                />
              </div>
            </>
          )
        }

        <button className="submit-btn custom-btn" onClick={onSettingInfo}>
          Ok
        </button>
      </Modal>
      <Modal
        isOpen={transferModalIsOpen}
        onAfterOpen={afterOpenModal}
        onRequestClose={() => setTransferModalIsOpen(false)}
        style={customStyles}
        contentLabel="Transfer Modal"
      >
        <h2>Transfer Dialog</h2>

        <div className="input-group">
          <label htmlFor="">Token Address</label>
          <input
            onChange={(e) => setTransferTokenAddr(e.target.value)}
            name="walletAddress"
            type="text"
            className="custom-input"
            placeholder="Address"
            value={transferTokenAddr}
          />
        </div>

        <div className="input-group">
          <label htmlFor="">Amount</label>
          <input
            onChange={(e) => setTransferAmount(e.target.value)}
            name="walletAddress"
            type="text"
            className="custom-input"
            placeholder="amount"
            value={transferAmount}
          />
        </div>

        <button className="submit-btn custom-btn" onClick={onSendToken}>
          Send
        </button>
      </Modal>

      <Modal
        isOpen={superAdminModalIsOpen}
        onAfterOpen={afterOpenSuperAdminModal}
        onRequestClose={closeSuperAdminModal}
        style={customStyles}
        contentLabel="Super Admin Modal"
      >
        <h2 >Admin Manager Dialog</h2>

        {adminList &&
          adminList.map((row, index) => {
            return (
              <div key={index} className="admin-flex">
                <div className="input-group">
                  <label htmlFor="">Admin Address</label>
                  <input
                    readOnly
                    name="walletAddress"
                    type="text"
                    className="custom-input"
                    placeholder="Address"
                    value={row.toBase58()}
                  />
                </div>
                <button
                  className="custom-btn remove-btn"
                  onClick={() => onRemoveAdmin(row.toBase58())}
                >
                  Remove
                </button>
              </div>
            );
          })}
        <div className="admin-flex">
          <div className="input-group">
            <label htmlFor="">New Admin Address</label>
            <input
              onChange={(e) => setNewAdminAddr(e.target.value)}
              name="walletAddress"
              type="text"
              className="custom-input"
              placeholder="Address"
              value={newAdminAddr}
            />
          </div>

          <button className="submit-btn custom-btn" onClick={() => onAddAdmin(newAdminAddr)}>
            Add
          </button>
        </div>
      </Modal>

      <div className="admin-header">
        {
          isAdmin != 2 && (
            <button
              className="custom-btn add-btn"
              style={{ marginRight: "10px" }}
              onClick={() => setTransferModalIsOpen(true)}
            >
              Deposit Token
            </button>
          )
        }
        {
          isAdmin == 0 && (
            <button
              className="custom-btn add-btn"
              style={{ marginRight: "10px" }}
              onClick={() => openSuperAdminModal()}
            >
              Manage Admin
            </button>
          )
        }

        <button
          className="custom-btn add-btn"
          style={{ marginRight: "10px" }}
          onClick={() => openSettingModal()}
        >
          Setting
        </button>

        {
          isAdmin == 0 && (
            <>
              <button
                className="custom-btn add-btn"
                style={{ marginRight: "10px" }}
                onClick={() => onWithdraw(false)}
              >
                Withdraw token
              </button>

              <button
                className="custom-btn add-btn"
                style={{ marginRight: "10px" }}
                onClick={() => onWithdraw(true)}
              >
                Withdraw liquidity
              </button>
            </>
          )
        }

        <button className="custom-btn add-btn" onClick={AddRow}>
          {" "}
          Add{" "}
        </button>
      </div>
      {rows &&
        rows.map((row, index) => {
          return (
            <div key={index} className="admin-flex">
              <div className="admin-div">
                <div className="input-group">
                  <label htmlFor="">Select NFT/Token/Sol</label>
                  <select
                    className="custom-input"
                    onChange={(e) => OnChange(e, index)}
                    name="type"
                    value={row.type}
                  >
                    <option value="nft">
                      NFT
                    </option>
                    <option value="token">Token</option>
                    <option value="sol">Sol</option>
                  </select>
                </div>
                <div className="input-group">
                  <label htmlFor="">Address</label>
                  <input
                    disabled={row.type == "sol"}
                    onChange={(e) => OnChange(e, index)}
                    name="walletAddress"
                    type="text"
                    className="custom-input"
                    placeholder="Address"
                    value={row.walletAddress}
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="">Price</label>
                  <input
                    onChange={(e) => OnChange(e, index)}
                    name="price"
                    type="text"
                    className="custom-input"
                    placeholder="Price"
                    value={row.price}
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="">Winning Percentage</label>
                  <input
                    onChange={(e) => OnChange(e, index)}
                    type="text"
                    name="winningPercentage"
                    className="custom-input"
                    placeholder="Winning Percentage"
                    value={row.winningPercentage}
                  />
                </div>
              </div>
              <button
                className="custom-btn remove-btn"
                onClick={() => RemoveRow(index)}
              >
                Remove
              </button>
            </div>
          );
        })}

      <hr />
      <button className="submit-btn custom-btn" onClick={onSetRows}>
        Submit
      </button>
    </div>
  );
}

export default Admin;
