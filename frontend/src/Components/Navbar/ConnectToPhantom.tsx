/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect, useState } from "react";
import { PublicKey, Transaction } from "@solana/web3.js";

type Event = "connect" | "disconnect";
type DisplayEncoding = "utf8" | "hex";
type PhantomEvent = "disconnect" | "connect";
type PhantomRequestMethod =
  | "connect"
  | "disconnect"
  | "signTransaction"
  | "signAllTransactions"
  | "signMessage";

interface ConnectOpts {
  onlyIfTrusted: boolean;
}
interface Phantom {
  publicKey: PublicKey | null;
  isConnected: boolean | null;
  autoApprove: boolean | null;
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
  signAllTransactions: (transactions: Transaction[]) => Promise<Transaction[]>;
  signMessage: (
    message: Uint8Array | string,
    display?: DisplayEncoding
  ) => Promise<any>;
  connect: (opts?: Partial<ConnectOpts>) => Promise<void>;
  disconnect: () => Promise<void>;
  on: (event: PhantomEvent, handler: (args: any) => void) => void;
  request: (method: PhantomRequestMethod, params: any) => Promise<any>;
}

// interface Phantom {
//   on: (event: Event, callback: () => void) => void;
//   connect: () => Promise<void>;
//   disconnect: () => Promise<void>;
// }

const ConnectToPhantom = () => {
  const [phantom, setPhantom] = useState<Phantom | null>(null);

  useEffect(() => {
    if ("solana" in window) {
      setPhantom((window as { [key: string]: any })["solana"]);
    }
  }, []);

  const [connected, setConnected] = useState(false);

  useEffect(() => {
    phantom?.on("connect", () => {
      setConnected(true);
    });

    phantom?.on("disconnect", () => {
      setConnected(false);
    });
  }, [phantom]);

  const connectHandler = async () => {
    if ("solana" in window) {
      const solana = (window as { [key: string]: any })["solana"];
      try {
        const response = await solana.connect();

        (window as { [key: string]: any })["curWallet"] = response; //.publicKey.toString();
      } catch (error) {}
      phantom?.connect();
    }
  };

  const disconnectHandler = () => {
    phantom?.disconnect();
  };

  if (phantom) {
    if (connected) {
      return (
        <button className="connect_metamsk_btn" onClick={disconnectHandler}>
          Disconnect from Phantom
        </button>
      );
    }

    return (
      <button className="connect_metamsk_btn" onClick={connectHandler}>
        Connect to Phantom
      </button>
    );
  }

  return (
    <a
      href="https://phantom.app/"
      target="_blank"
      className="bg-purple-500 px-4 py-2 border border-transparent rounded-md text-base font-medium text-white"
      rel="noreferrer"
    >
      Get Phantom
    </a>
  );
};

export default ConnectToPhantom;
