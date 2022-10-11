import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { Spin } from "../target/types/spin";

import { PublicKey, SystemProgram, Transaction, Connection, Commitment, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, createMint, createAccount, mintTo } from "@solana/spl-token";
import { assert } from "chai";
import { connection } from "@iboss/terrain/lib/config";

describe("spin", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Spin as Program<Spin>;

  let mintA = null;
  let mintB = null;
  let initializerTokenAccountA = null;
  let initializerTokenAccountB = null;
  let takerTokenAccountA = null;
  let takerTokenAccountB = null;
  let vault_account_pda = null;
  let vault_account_bump = null;
  let vault_authority_pda = null;

  let pool_account_pda = null;
  let pool_account_bump = null;

  let token_vault_list = [];

  let testPoolAcc = null;

  const takerAmount = 1000;
  const initializerAmount = 500;

  const escrowAccount = anchor.web3.Keypair.generate();
  const payer = anchor.web3.Keypair.generate();
  const mintAuthority = anchor.web3.Keypair.generate();
  const initializerMainAccount = anchor.web3.Keypair.generate();
  const takerMainAccount = anchor.web3.Keypair.generate();

  it("Is initialized!", async () => {
    // Airdropping tokens to a payer.
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(payer.publicKey, 1000000000),
      "processed"
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(provider.wallet.publicKey, 1000000000),
      "processed"
    );

    // Fund Main Accounts
    await provider.sendAndConfirm(
      (() => {
        const tx = new Transaction();
        tx.add(
          SystemProgram.transfer({
            fromPubkey: payer.publicKey,
            toPubkey: initializerMainAccount.publicKey,
            lamports: 100000000,
          }),
          SystemProgram.transfer({
            fromPubkey: payer.publicKey,
            toPubkey: takerMainAccount.publicKey,
            lamports: 100000000,
          })
        );
        return tx;
      })(),
      [payer]
    );

    mintA = await createMint(
      provider.connection,
      payer,
      mintAuthority.publicKey,
      null,
      0
    );


    let ss = new PublicKey(initializerMainAccount.publicKey);
    console.log('1111111111111', mintA, ss);

    initializerTokenAccountA = await createAccount(provider.connection, ss, mintA);
    takerTokenAccountA = await createAccount(provider.connection, takerMainAccount.publicKey, mintA);


    await mintTo(
      connection,
      initializerTokenAccountA,
      mintAuthority.publicKey,
      [mintAuthority],
      initializerAmount
    );

    await mintTo(
      connection,
      takerTokenAccountB,
      mintAuthority.publicKey,
      [mintAuthority],
      takerAmount
    );
  });


  it("Initialize escrow", async () => {
    let [_pool, _pool_bump] = await PublicKey.findProgramAddress([Buffer.from(anchor.utils.bytes.utf8.encode("sw_game_seeds"))], program.programId);
    pool_account_pda = _pool;
    pool_account_bump = _pool_bump;

    const [_vault_account_pda, _vault_account_bump] = await PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode("sw_token-seed"))],
      program.programId
    );
    vault_account_pda = _vault_account_pda;
    vault_account_bump = _vault_account_bump;

    const [_vault_authority_pda, _vault_authority_bump] = await PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode("escrow"))],
      program.programId
    );
    vault_authority_pda = _vault_authority_pda;

    console.log('initialize start...');


    // let randomPubkey = anchor.web3.Keypair.generate().publicKey;
    // let [_pool111, _bump111] = await PublicKey.findProgramAddress(
    //   [randomPubkey.toBuffer()],
    //   program.programId
    // );


    const [_pool111, _bump111] = await PublicKey.findProgramAddress([Buffer.from(anchor.utils.bytes.utf8.encode("sw_game_vault_auth"))], program.programId);

    vault_account_pda = _pool111;

    pool_account_pda = await PublicKey.createWithSeed(
      initializerMainAccount.publicKey,
      "user-lottery-pool",
      program.programId,
    );

    await program.rpc.initialize(
      _bump111,
      {
        accounts: {
          initializer: initializerMainAccount.publicKey,
          pool: _pool111,
          state: pool_account_pda,
          systemProgram: anchor.web3.SystemProgram.programId,
        },
        signers: [initializerMainAccount],
        preInstructions: [
          SystemProgram.createAccountWithSeed({
            fromPubkey: initializerMainAccount.publicKey,
            basePubkey: initializerMainAccount.publicKey,
            seed: "user-lottery-pool",
            newAccountPubkey: pool_account_pda,
            lamports: await provider.connection.getMinimumBalanceForRentExemption(4975),
            space: 4975,
            programId: program.programId,
          })
        ]
      }
    );

    
    testPoolAcc = await mintA.createAccount(_pool111);
    await mintA.mintTo(
      testPoolAcc,
      mintAuthority.publicKey,
      [mintAuthority],
      100
    );

    console.log('initialize end...');
  });


});
