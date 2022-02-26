import type { NextPage } from "next";
import React, { useEffect, useState } from "react";
import * as s from "../styles/globalStyles";
import styled from "styled-components";
import { useDataContext } from "../contexts/DataContext";
import axios from "axios";

export const StyledButton = styled.button`
  padding: 50px;
  border-radius: 5px;
  border: none;
  background-color: var(--accent-text);
  padding: 10px;
  font-weight: bold;
  font-size: 20px;
  color: var(--text-white);
  width: 200px;
  cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
  box-shadow: 0px 6px 0px -2px rgba(250, 250, 250, 0.3);
  :active {
    box-shadow: none;
  }
`;

export const StyledRoundButton = styled.button`
  padding: 10px;
  border-radius: 0%;
  border: none;
  padding: 10px;
  font-weight: bold;
  font-size: 10px;
  color: var(--primary-text);
  width: 30px;
  height: 30px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0px 4px 0px -2px rgba(250, 250, 250, 0.3);
  :active {
    box-shadow: none;
  }
`;

export const ResponsiveWrapper = styled.div`
  display: flex;
  flex: 1;
  font-family: "Red Hat Display", sans-serif;
  flex-direction: column;
  justify-content: stretched;
  align-items: stretched;
  width: 62%;
  @media (min-width: 600px) {
    flex-direction: row;
  }
`;

export const StyledImg = styled.img`
  border-radius: 20px;
  width: 250px;
  @media (min-width: 600px) {
    width: 250px;
  }
  @media (min-width: 800px) {
    width: 500px;
  }
  transition: width 0.5s;
`;

export const SizedText = styled.p`
  border-radius: 0;
  font-size: 10px;
  @media (min-width: 600px) {
    font-size: 10px;
  }
  @media (min-width: 800px) {
    font-size: 50px;
  }
  transition: width 0.5s;
`;

export const StyledLink = styled.a`
  color: var(--color-text);
  text-decoration: none;
  font-weight: bold;
`;

const formatTime = (time: number) => {
  const totalSeconds = Math.floor(time / 1000);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor((totalSeconds / 60) % 60);
  const hours = Math.floor(totalSeconds / 3600);

  return {
    seconds,
    minutes,
    hours,
  };
};

const MintPage: NextPage = () => {
  const {
    state,
    blockchainState,
    fetchIsWhitelisted,
    fetchData,
    refetchData,
    connect,
    requestAccount,
  } = useDataContext();

  const [claimingNft, setClaimingNft] = useState(false);
  const [feedback, setFeedback] = useState(`Click to mint your NFT.`);
  const [mintAmount, setMintAmount] = useState(1);
  const [CONFIG, SET_CONFIG] = useState({
    SCAN_LINK: "",
    NETWORK: {
      NAME: "",
      SYMBOL: "",
      ID: 0,
    },
    NFT_NAME: "",
    SYMBOL: "",
    MAX_SUPPLY: 1,
    WEI_COST: 0,
    DISPLAY_COST: 0,
    GAS_LIMIT: 0,
    MARKETPLACE: "",
    MARKETPLACE_LINK: "",
    SHOW_BACKGROUND: false,
    ENABLE_MINT: false,
  });

  const claimNFTs = async () => {
    let cost = state.cost || CONFIG.WEI_COST;
    let gasLimit = CONFIG.GAS_LIMIT;
    let totalCostWei = String(cost * mintAmount);
    let totalGasLimit = String(gasLimit * mintAmount);
    console.log("Cost: ", totalCostWei);
    console.log("Gas limit: ", totalGasLimit);
    setFeedback(`Minting your ${CONFIG.NFT_NAME}...`);
    setClaimingNft(true);

    if (blockchainState?.smartContract?.methods) {
      let receipt;

      try {
        if (state.stage === 0) {
          const { origin } = window;
          const { data } = await axios.post(`${origin}/api/generate-ticket`, {
            address: blockchainState.account,
          });
          const { ticket, signature } = data;
          receipt = await blockchainState?.smartContract?.methods
            .whitelistMint(mintAmount, ticket, signature)
            .send({
              gasLimit: String(totalGasLimit),
              from: blockchainState.account,
              value: totalCostWei,
            });
        } else {
          receipt = await blockchainState?.smartContract?.methods
            .mint(mintAmount)
            .send({
              gasLimit: String(totalGasLimit),
              from: blockchainState.account,
              value: totalCostWei,
            });
        }

        console.log(receipt);
        setFeedback(
          `WOW, the ${CONFIG.NFT_NAME} is yours! go visit Opensea.io to view it.`
        );
      } catch (err: any) {
        console.log(err);
        setFeedback("Sorry, something went wrong please try again later.");
        setClaimingNft(false);
      }
      if (blockchainState.account) {
        fetchIsWhitelisted?.(blockchainState.account, state.tierIndex);
        fetchData?.();
      }
      setClaimingNft(false);
    }
  };

  useEffect(() => {
    const getConfig = async () => {
      const configResponse = await fetch("/config/config.json", {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });
      const config = await configResponse.json();
      SET_CONFIG(config);
    };

    getConfig();
  }, []);

  useEffect(() => {
    connect?.();
  }, [connect]);

  useEffect(() => {
    if (blockchainState.account) {
      fetchData?.();
    }
  }, [blockchainState.account, fetchData]);

  useEffect(() => {
    if (blockchainState.account) {
      fetchIsWhitelisted?.(blockchainState.account, state.tierIndex);
    }
  }, [blockchainState.account, fetchIsWhitelisted, state.tierIndex]);

  useEffect(() => {
    if (blockchainState.smartContract) {
      fetchData?.();
    }
  }, [blockchainState.smartContract, fetchData]);

  const isNotInWhiteList = state.stage === 0 && !state.isWhitelisted;
  const loadingWhitelist = state.stage === 0 && state.loadingWhitelist;

  const screenWidth =
    typeof window !== "undefined"
      ? window.innerWidth > 0
        ? window.innerWidth
        : screen.width
      : 1366;
  const isMobile = screenWidth < 992;
  const displayCost = (state.cost / 10 ** 18).toString();

  const [timeCountDown, setTimeCountDown] = useState(1000000);
  const [locked, setLocked] = useState(true);
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    let timer: number | null;
    const refetchIfTimeout = () => {
      const now = new Date().getTime();
      if (state.startTime > now) {
        setLocked(true);
        const timeDelta = state.startTime - now;
        setTimeCountDown(timeDelta);
      } else if (state.endTime > now) {
        setLocked(false);
        const timeDelta = state.endTime - now;
        setTimeCountDown(timeDelta);
      } else {
        refetchData?.();
      }
    };

    refetchIfTimeout();
    timer = window.setInterval(() => {
      refetchIfTimeout();
    }, 1000);

    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [refetchData, state.endTime, state.startTime]);

  useEffect(() => {
    let timer: number | null;
    if (!state.loading) {
      timer = window.setInterval(() => {
        refetchData?.();
      }, 1000);
    }

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [refetchData, state.loading]);

  const formattedTimeCountdown = formatTime(timeCountDown);

  return (
    <s.Screen>
      <s.Container
        flex={1}
        ai={"center"}
        style={{
          padding: isMobile ? "40px 4px" : 24,
          backgroundColor: "var(--primary)",
        }}
        image={null}
      >
        <s.SpacerSmall />
        <ResponsiveWrapper
          style={{
            padding: isMobile ? 4 : 24,
            width: isMobile ? "100%" : "auto",
          }}
        >
          <s.Container flex={1} jc={"center"} ai={"center"}>
            <StyledImg alt="NFT" src={"/config/images/AP_Chips_1.gif"} />
          </s.Container>
          <s.SpacerLarge />
          <s.Container
            flex={2}
            jc={"center"}
            ai={"center"}
            style={{
              backgroundColor: "",
              padding: isMobile ? 12 : 24,
              borderRadius: 0,
              border: "4px none var(--color-text)",
            }}
          >
            <s.SizedText
              style={{
                margin: -10,
                textAlign: "center",
                fontSize: 40,
                fontWeight: "bold",
                color: "var(--accent-text)",
                lineHeight: 1.05,
              }}
            >
              <p>{state.stageName} Mint</p>
            </s.SizedText>

            <s.SpacerSmall />
            {state.loading && blockchainState.loading ? (
              <s.TextTitle
                style={{ textAlign: "center", color: "var(--accent-text)" }}
              >
                Loading...
              </s.TextTitle>
            ) : Number(state.totalSupply) >= state.maxSupply ? (
              <div>
                <s.TextTitle
                  style={{ textAlign: "center", color: "var(--accent-text)" }}
                >
                  The sale has ended.
                </s.TextTitle>
                <s.TextDescription
                  style={{ textAlign: "center", color: "var(--accent-text)" }}
                >
                  You can still find {CONFIG.NFT_NAME} on
                </s.TextDescription>
                <s.SpacerSmall />
                <StyledLink target={"_blank"} href={CONFIG.MARKETPLACE_LINK}>
                  {CONFIG.MARKETPLACE}
                </StyledLink>
              </div>
            ) : (
              <div>
                <s.TextTitle
                  style={{ textAlign: "center", color: "var(--accent-text)" }}
                >
                  <span style={{ fontWeight: "bold" }}>
                    Mint Price{" "}
                    <span style={{ color: "var(--color-text)" }}>
                      {displayCost} ETH
                    </span>
                  </span>
                </s.TextTitle>
                <s.SpacerXSmall />
                <s.TextDescription
                  style={{
                    fontSize: "40px",
                    textAlign: "center",
                    color: "var(--accent-text)",
                    fontWeight: "bold",
                  }}
                >
                  <span
                    style={{ textAlign: "center", color: "var(--color-text)" }}
                  >
                    {state.totalSupply < 0
                      ? "?"
                      : state.maxSupply - state.totalSupply}{" "}
                    /
                  </span>{" "}
                  {state.maxSupply || CONFIG.MAX_SUPPLY}
                </s.TextDescription>
                <s.SpacerSmall />
                {!blockchainState.account ||
                blockchainState.smartContract === null ? (
                  <s.Container ai={"center"} jc={"center"}>
                    <s.TextDescription
                      style={{
                        textAlign: "center",
                        color: "var(--accent-text)",
                      }}
                    ></s.TextDescription>
                    <s.SpacerSmall />
                    <StyledButton
                      disabled={locked}
                      onClick={(e) => {
                        if (!locked) {
                          e.preventDefault();
                          requestAccount?.();
                        }
                      }}
                    >
                      {state.loading
                        ? "Loading"
                        : locked
                        ? `Coming Soon ${formattedTimeCountdown.hours
                            .toString()
                            .padStart(2, "0")}:${formattedTimeCountdown.minutes
                            .toString()
                            .padStart(2, "0")}:${formattedTimeCountdown.seconds
                            .toString()
                            .padStart(2, "0")}`
                        : "Connect Wallet"}
                    </StyledButton>
                    {blockchainState.errorMsg !== "" ? (
                      <>
                        <s.SpacerSmall />
                        <s.TextDescription
                          style={{
                            textAlign: "center",
                            color: "var(--accent-text)",
                          }}
                        >
                          {blockchainState.errorMsg}
                        </s.TextDescription>
                      </>
                    ) : null}
                  </s.Container>
                ) : (
                  <div>
                    {!isNotInWhiteList && (
                      <>
                        <s.TextDescription
                          style={{
                            textAlign: "center",
                            color: "var(--accent-text)",
                          }}
                        >
                          {feedback}
                        </s.TextDescription>
                        <s.SpacerMedium />
                      </>
                    )}

                    <s.SpacerSmall />
                    <s.Container ai={"center"} jc={"center"} fd={"row"}>
                      <StyledButton
                        disabled={
                          isNotInWhiteList ? true : claimingNft ? true : false
                        }
                        onClick={(e) => {
                          e.preventDefault();
                          if (!isNotInWhiteList) {
                            claimNFTs();
                          }
                        }}
                      >
                        {loadingWhitelist
                          ? "Loading"
                          : isNotInWhiteList
                          ? "Not in Whitelist"
                          : claimingNft
                          ? "BUSY"
                          : `MINT ${formattedTimeCountdown.hours
                              .toString()
                              .padStart(
                                2,
                                "0"
                              )}:${formattedTimeCountdown.minutes
                              .toString()
                              .padStart(
                                2,
                                "0"
                              )}:${formattedTimeCountdown.seconds
                              .toString()
                              .padStart(2, "0")}`}
                      </StyledButton>
                    </s.Container>
                  </div>
                )}
              </div>
            )}
            <s.SpacerMedium />
          </s.Container>
          <s.SpacerLarge />
        </ResponsiveWrapper>

        <s.SpacerMedium />

        <s.Container jc={"center"} ai={"center"} style={{ width: "70%" }}>
          <s.TextDescription
            style={{
              textAlign: "center",
              color: "var(--primary-text)",
            }}
          >
            Please make sure you are connected to the right network (Ethereum
            Mainnet) and the correct address.
          </s.TextDescription>
          <s.SpacerSmall />
          <s.TextDescription
            style={{
              textAlign: "center",
              color: "var(--primary-text)",
            }}
          ></s.TextDescription>
        </s.Container>
      </s.Container>
    </s.Screen>
  );
};

export default MintPage;
