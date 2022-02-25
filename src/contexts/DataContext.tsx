import React, { useCallback, useContext, useReducer } from "react";
import { Contract } from "web3-eth-contract";
import { MetaMaskInpageProvider } from "@metamask/providers";
import { provider } from "web3-core";
import Web3 from "web3";
import axios from "axios";

const stages = ["Whitelist", "Auction", "Public"];

const saleConfigs = [
  {
    tierIndex: 1,
    startTime: 1645759500,
    endTime: 1645759800,
    stageBatchSize: 1,
    stageLimit: 7,
    price: Web3.utils.toWei("0.8", "ether"),
    stage: stages.indexOf("Whitelist"),
  },
  {
    tierIndex: 2,
    startTime: 1645759800,
    endTime: 1645760100,
    stageBatchSize: 1,
    stageLimit: 50,
    price: Web3.utils.toWei("1.2", "ether"),
    stage: stages.indexOf("Whitelist"),
  },
  {
    tierIndex: 1,
    startTime: 1645760100,
    endTime: 1645761900,
    stageBatchSize: 1,
    stageLimit: 100,
    price: Web3.utils.toWei("3", "ether"),
    stage: stages.indexOf("Auction"),
  },
];

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
  startTime: number;
  endTime: number;
  cost: number;
  stage: number;
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
  loading: false,
  locked: true,
  currentSaleIndex: 0,
  maxMintAmount: 1,
  totalSupply: -1,
  maxSupply: 0,
  startTime: 0,
  endTime: 0,
  cost: 0,
  stage: 0,
  isWhitelisted: false,
  error: false,
  errorMsg: "",
};
const initialBlockchainState = {
  loading: false,
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
  fetchIsWhitelisted?: (account: string) => Promise<void>;
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
          typeof stage !== "undefined" &&
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
    case "FETCH_WHITELISTED":
      if (action.payload?.isWhitelisted) {
        return {
          ...state,
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

  const fetchIsWhitelisted = useCallback(async (account: string) => {
    try {
      const { origin } = window;
      const { data } = await axios.post(`${origin}/api/whitelisted`, {
        address: account,
      });
      const isWhitelisted = data.isWhitelisted;

      fetchWhitelisted(isWhitelisted);
    } catch (err) {
      console.log(err);
      fetchDataFailed("Could not load data from contract.");
    }
  }, []);

  const fetchData = useCallback(async () => {
    fetchDataRequest();
    try {
      if (blockchainState?.smartContract) {
        const [totalSupply, currentSaleIndex] = await Promise.all([
          blockchainState?.smartContract?.methods.totalSupply().call(),
          blockchainState?.smartContract?.methods.currentSaleIndex().call(),
        ]);

        const now = new Date().getTime() / 1000;
        const saleConfigIndex =
          now < saleConfigs[0].startTime
            ? 0
            : now > saleConfigs[saleConfigs.length - 1].endTime
            ? saleConfigs.length - 1
            : saleConfigs.findIndex(
                (saleConfig) =>
                  saleConfig.startTime <= now && saleConfig.endTime >= now
              ) ?? parseInt(currentSaleIndex);
        const saleConfig = saleConfigs[saleConfigIndex];
        let price = saleConfig.price;

        if (stages[saleConfig.stage] === "Auction") {
          const auctionPrice = await blockchainState?.smartContract?.methods
            .getAuctionPrice()
            .call();
          price = auctionPrice;
        }

        fetchDataSuccess({
          maxSupply: saleConfig.stageLimit,
          totalSupply: parseInt(totalSupply),
          startTime: saleConfig.startTime * 1000,
          endTime: saleConfig.endTime * 1000,
          cost: parseInt(price),
          stage: saleConfig.stage,
          maxMintAmount: saleConfig.stageBatchSize,
          currentSaleIndex: saleConfigIndex,
        });
      }
    } catch (err) {
      console.log(err);
      fetchDataFailed("Could not load data from contract.");
    }
  }, [blockchainState?.smartContract]);

  const refetchData = useCallback(async () => {
    try {
      if (blockchainState?.smartContract) {
        const [totalSupply, currentSaleIndex] = await Promise.all([
          blockchainState?.smartContract?.methods.totalSupply().call(),
          blockchainState?.smartContract?.methods.currentSaleIndex().call(),
        ]);

        const now = new Date().getTime() / 1000;
        const saleConfigIndex =
          now < saleConfigs[0].startTime
            ? 0
            : now > saleConfigs[saleConfigs.length - 1].endTime
            ? saleConfigs.length - 1
            : saleConfigs.findIndex(
                (saleConfig) =>
                  saleConfig.startTime <= now && saleConfig.endTime >= now
              ) ?? parseInt(currentSaleIndex);
        const saleConfig = saleConfigs[saleConfigIndex];
        let price = saleConfig.price;

        if (stages[saleConfig.stage] === "Auction") {
          const auctionPrice = await blockchainState?.smartContract?.methods
            .getAuctionPrice()
            .call();
          price = auctionPrice;
        }

        fetchDataSuccess({
          maxSupply: saleConfig.stageLimit,
          totalSupply: parseInt(totalSupply),
          startTime: saleConfig.startTime * 1000,
          endTime: saleConfig.endTime * 1000,
          cost: parseInt(price),
          stage: saleConfig.stage,
          maxMintAmount: saleConfig.stageBatchSize,
          currentSaleIndex: saleConfigIndex,
        });
      }
    } catch (err) {
      console.log(err);
      fetchDataFailed("Could not load data from contract.");
    }
  }, [blockchainState?.smartContract]);

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
    const abiResponse = await fetch("/config/abi.json", {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
    const abi = await abiResponse.json();
    const configResponse = await fetch("/config/config.json", {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
    const CONFIG = await configResponse.json();
    const { ethereum } = window;
    const metamaskIsInstalled = ethereum && ethereum.isMetaMask;

    if (metamaskIsInstalled) {
      let web3 = new Web3(ethereum as provider);

      try {
        const networkId = await ethereum.request({
          method: "net_version",
        });
        if (networkId == CONFIG.NETWORK.ID) {
          const SmartContractObj = new web3.eth.Contract(
            abi,
            CONFIG.CONTRACT_ADDRESS
          );

          connectSuccess({
            smartContract: SmartContractObj,
            web3: web3,
          });

          // Add listeners start
          ethereum.on("accountsChanged", (accounts) => {
            updateAccountRequest((accounts as string[])[0]);
          });
          ethereum.on("chainChanged", () => {
            window.location.reload();
          });
          // Add listeners end
        } else {
          connectFailed(`Change network to ${CONFIG.NETWORK.NAME}.`);
        }
      } catch (err) {
        connectFailed("Something went wrong.");
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
