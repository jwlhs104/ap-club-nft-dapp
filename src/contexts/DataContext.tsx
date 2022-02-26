import React, { useCallback, useContext, useReducer } from "react";
import { Contract } from "web3-eth-contract";
import { MetaMaskInpageProvider } from "@metamask/providers";
import { provider } from "web3-core";
import Web3 from "web3";
import axios from "axios";

const stages = ["Whitelist", "Dutch Auction", "Public Sale"];

declare global {
  interface Window {
    ethereum: MetaMaskInpageProvider;
  }
}

type DataProps = {
  loading: boolean;
  locked: boolean;
  currentSaleIndex: number;
  maxMintAmount: number;
  totalSupply: number;
  maxSupply: number;
  tierIndex: number;
  stageName: string;
  startTime: number;
  endTime: number;
  cost: number;
  stage: number;
  loadingWhitelist: boolean;
  isWhitelisted: boolean;
  error: boolean;
  errorMsg: string;
};
type DateAction = {
  type: DataActionType;
  payload?: Partial<DataProps>;
};
type DataActionType =
  | "CHECK_DATA_REQUEST"
  | "CHECK_DATA_SUCCESS"
  | "CHECK_DATA_FAILED"
  | "START_FETCH_WHITELISTED"
  | "FETCH_WHITELISTED";

type BlockchainDataProps = {
  loading: boolean;
  account: string | null;
  smartContract: Contract | null;
  web3: Web3 | null;
  errorMsg: string | null;
};
type BlockchainDataAction = {
  type: BlockchainDataActionType;
  payload?: Partial<BlockchainDataProps>;
};
type BlockchainDataActionType =
  | "CONNECTION_REQUEST"
  | "CONNECTION_SUCCESS"
  | "CONNECTION_FAILED"
  | "UPDATE_ACCOUNT";

const initialDataState = {
  loading: true,
  locked: true,
  currentSaleIndex: 0,
  maxMintAmount: 1,
  totalSupply: -1,
  maxSupply: 0,
  tierIndex: 0,
  stageName: "NFT",
  startTime: 0,
  endTime: 0,
  cost: 0,
  stage: 0,
  loadingWhitelist: true,
  isWhitelisted: false,
  error: false,
  errorMsg: "",
};
const initialBlockchainState = {
  loading: true,
  account: null,
  smartContract: null,
  web3: null,
  errorMsg: "",
};

const DataContext = React.createContext<{
  state: DataProps;
  blockchainState: BlockchainDataProps;
  fetchDataRequest?: () => void;
  fetchDataSuccess?: (payload: Required<DataProps>) => void;
  fetchDataFailed?: (errorMsg: string) => void;
  fetchData?: () => Promise<void>;
  refetchData?: () => Promise<void>;
  fetchWhitelisted?: (isWhitelisted: boolean) => void;
  fetchIsWhitelisted?: (account: string, tierIndex: number) => Promise<void>;
  connectRequest?: () => void;
  connectSuccess?: (payload: Required<DataProps>) => void;
  connectFailed?: (errorMsg: string) => void;
  requestAccount?: () => Promise<void>;
  updateAccountRequest?: (account: string) => void;
  connect?: () => Promise<void>;
}>({
  state: initialDataState,
  blockchainState: initialBlockchainState,
});

export const useDataContext = () => useContext(DataContext);

const dataReducer: (state: DataProps, action: DateAction) => DataProps = (
  state,
  action
) => {
  switch (action.type) {
    case "CHECK_DATA_REQUEST":
      return {
        ...state,
        loading: true,
        error: false,
        errorMsg: "",
      };
    case "CHECK_DATA_SUCCESS":
      if (action.payload) {
        const {
          stageName,
          tierIndex,
          currentSaleIndex,
          maxMintAmount,
          startTime,
          endTime,
          totalSupply,
          maxSupply,
          cost,
          stage,
        } = action.payload;

        if (
          typeof currentSaleIndex !== "undefined" &&
          typeof totalSupply !== "undefined" &&
          typeof tierIndex !== "undefined" &&
          typeof stage !== "undefined" &&
          stageName &&
          startTime &&
          endTime &&
          maxMintAmount &&
          maxSupply &&
          cost
        ) {
          return {
            ...state,
            loading: false,
            currentSaleIndex,
            maxMintAmount,
            totalSupply,
            maxSupply,
            tierIndex,
            stage,
            stageName,
            startTime,
            endTime,
            cost,
            error: false,
            errorMsg: "",
          };
        }
      }
      return state;

    case "CHECK_DATA_FAILED":
      if (action.payload?.errorMsg) {
        return {
          ...initialDataState,
          loading: false,
          error: true,
          errorMsg: action.payload.errorMsg,
        };
      } else {
        return state;
      }
    case "START_FETCH_WHITELISTED":
      return {
        ...state,
        loadingWhitelist: true,
      };
    case "FETCH_WHITELISTED":
      if (typeof action.payload?.isWhitelisted !== "undefined") {
        return {
          ...state,
          loadingWhitelist: false,
          isWhitelisted: action.payload.isWhitelisted,
        };
      } else {
        return state;
      }
    default:
      return state;
  }
};

const blockchainDataReducer: (
  state: BlockchainDataProps,
  action: BlockchainDataAction
) => BlockchainDataProps = (state, action) => {
  switch (action.type) {
    case "CONNECTION_REQUEST":
      return {
        ...initialBlockchainState,
        loading: true,
      };
    case "CONNECTION_SUCCESS":
      if (action.payload) {
        const { smartContract, web3 } = action.payload;

        if (smartContract && web3) {
          return {
            ...state,
            loading: false,
            smartContract,
            web3,
          };
        }
      }
      return state;
    case "CONNECTION_FAILED":
      if (action.payload?.errorMsg) {
        return {
          ...initialBlockchainState,
          loading: false,
          errorMsg: action.payload.errorMsg,
        };
      } else {
        return state;
      }
    case "UPDATE_ACCOUNT":
      if (action.payload?.account) {
        return {
          ...state,
          loading: false,
          account: action.payload.account,
        };
      } else {
        return state;
      }
    default:
      return state;
  }
};

const DataContextProvider: React.FC = ({ children }) => {
  const [state, dispatch] = useReducer(dataReducer, initialDataState);
  const [blockchainState, blockchainDispatch] = useReducer(
    blockchainDataReducer,
    initialBlockchainState
  );

  const fetchDataRequest = () => {
    dispatch({ type: "CHECK_DATA_REQUEST" });
  };
  const fetchDataSuccess = (payload: Partial<DataProps>) => {
    dispatch({ type: "CHECK_DATA_SUCCESS", payload });
  };
  const fetchDataFailed = (errorMsg: string) => {
    dispatch({ type: "CHECK_DATA_FAILED", payload: { errorMsg } });
  };
  const fetchWhitelisted = (isWhitelisted: boolean) => {
    dispatch({ type: "FETCH_WHITELISTED", payload: { isWhitelisted } });
  };

  const fetchIsWhitelisted = useCallback(
    async (account: string, tierIndex: number) => {
      try {
        dispatch({ type: "START_FETCH_WHITELISTED" });

        const { origin } = window;
        const { data } = await axios.post(`${origin}/api/generate-ticket`, {
          address: account,
          tierIndex,
        });
        const { ticket, signature } = data;

        if (signature) {
          const isTicketAvailable =
            await blockchainState?.smartContract?.methods
              .isTicketAvailable(ticket, signature)
              .call({ from: blockchainState.account });

          fetchWhitelisted(isTicketAvailable);
        } else {
          fetchWhitelisted(false);
        }
      } catch (err) {
        console.log(err);
        fetchDataFailed("Could not load data from contract.");
      }
    },
    [blockchainState.account, blockchainState?.smartContract?.methods]
  );

  const refetchData = useCallback(async () => {
    try {
      if (blockchainState?.smartContract) {
        let currentSaleIndex = -1;
        let isSaleRoundValid = false;
        let saleConfig = null;
        let stageName = "";
        let startTime = "0",
          endTime = "0";

        const [totalSupply, collectionSize] = await Promise.all([
          blockchainState?.smartContract?.methods.totalSupply().call(),
          blockchainState?.smartContract?.methods.collectionSize().call(),
        ]);

        while (!isSaleRoundValid && currentSaleIndex < 2) {
          currentSaleIndex++;

          saleConfig = await blockchainState?.smartContract?.methods
            .saleConfigs(currentSaleIndex)
            .call();
          startTime = saleConfig["startTime"];
          endTime = saleConfig["endTime"];
          const now = Math.floor(new Date().getTime() / 1000);

          if (parseInt(startTime) > now) {
            break;
          }
          isSaleRoundValid =
            parseInt(startTime) <= now && parseInt(endTime) >= now;
        }

        if (currentSaleIndex < 0) {
          currentSaleIndex = 0;
        }

        stageName = stages[parseInt(saleConfig.stage)];
        let price = saleConfig.price;
        if (stages[parseInt(saleConfig.stage)] === "Dutch Auction") {
          const now = Math.floor(new Date().getTime() / 1000);
          const auctionPrice = await blockchainState?.smartContract?.methods
            .getAuctionPrice(now)
            .call();
          price = auctionPrice;
        } else if (stages[parseInt(saleConfig.stage)] === "Whitelist") {
          stageName = `${stageName} Tier ${saleConfig.tierIndex}`;
        }

        fetchDataSuccess({
          stageName,
          tierIndex: parseInt(saleConfig.tierIndex),
          maxSupply: parseInt(collectionSize),
          totalSupply: parseInt(totalSupply),
          startTime: parseInt(startTime) * 1000,
          endTime: parseInt(endTime) * 1000,
          cost: parseInt(price),
          stage: parseInt(saleConfig.stage),
          maxMintAmount: parseInt(saleConfig.stageBatchSize),
          currentSaleIndex,
        });
      }
    } catch (err) {
      console.log(err);
      fetchDataFailed("Could not load data from contract.");
    }
  }, [blockchainState?.smartContract]);

  const fetchData = useCallback(async () => {
    fetchDataRequest();
    try {
      refetchData();
    } catch (err) {
      console.log(err);
      fetchDataFailed("Could not load data from contract.");
    }
  }, [refetchData]);

  const connectRequest = () => {
    blockchainDispatch({ type: "CONNECTION_REQUEST" });
  };
  const connectSuccess = (payload: Partial<BlockchainDataProps>) => {
    blockchainDispatch({ type: "CONNECTION_SUCCESS", payload });
  };
  const connectFailed = (errorMsg: string) => {
    blockchainDispatch({ type: "CONNECTION_FAILED", payload: { errorMsg } });
  };
  const updateAccountRequest = (account: string) => {
    blockchainDispatch({ type: "UPDATE_ACCOUNT", payload: { account } });
  };

  const requestAccount = async () => {
    try {
      const { ethereum } = window;
      const accounts = await ethereum.request({
        method: "eth_requestAccounts",
      });

      updateAccountRequest((accounts as string[])[0]);
      fetchData();
    } catch (err) {
      connectFailed("Something went wrong.");
    }
  };

  const connect = useCallback(async () => {
    connectRequest();
    const { origin } = window;
    const { data: abi } = await axios.get(`${origin}/config/abi.json`);
    const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as string;
    const NETWORK_ID = process.env.NEXT_PUBLIC_NETWORK_ID as string;

    const { ethereum } = window;
    if (ethereum && ethereum.isMetaMask) {
      const web3 = new Web3(ethereum as provider);
      ethereum.on("accountsChanged", (accounts) => {
        updateAccountRequest((accounts as string[])[0]);
      });

      ethereum.on("chainChanged", () => {
        console.log("change");
        window.location.reload();
      });

      const SmartContractObj = new web3.eth.Contract(abi, CONTRACT_ADDRESS);

      try {
        const networkId = await ethereum.request({
          method: "net_version",
        });
        if (networkId == NETWORK_ID) {
          connectSuccess({
            smartContract: SmartContractObj,
            web3: web3,
          });
        } else {
          ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: `0x${parseInt(NETWORK_ID).toString(16)}` }],
          });
        }
      } catch (err: any) {
        connectFailed(`Something went wrong. ${err.message}`);
      }
    } else {
      connectFailed("Install Metamask.");
    }
  }, []);

  return (
    <DataContext.Provider
      value={{
        state,
        blockchainState,
        fetchDataRequest,
        fetchDataSuccess,
        fetchDataFailed,
        fetchData,
        refetchData,
        fetchWhitelisted,
        fetchIsWhitelisted,
        connectRequest,
        connectSuccess,
        connectFailed,
        requestAccount,
        updateAccountRequest,
        connect,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export default DataContextProvider;
