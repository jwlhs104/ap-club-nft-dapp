import React, { useCallback, useContext, useReducer } from "react";
import { Contract } from "web3-eth-contract";
import { MetaMaskInpageProvider } from "@metamask/providers";
import { provider } from "web3-core";
import Web3 from "web3";

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
  cost: number;
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
  cost: 0,
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
          totalSupply,
          maxSupply,
          locked,
          cost,
        } = action.payload;

        if (
          currentSaleIndex &&
          maxMintAmount &&
          totalSupply &&
          maxSupply &&
          locked &&
          cost
        ) {
          return {
            ...state,
            loading: false,
            currentSaleIndex,
            maxMintAmount,
            totalSupply,
            maxSupply,
            locked,
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
    dispatch({ type: "CHECK_DATA_FAILED", payload: { isWhitelisted } });
  };

  const fetchIsWhitelisted = useCallback(
    async (account: string) => {
      try {
        const whitelistCount = await blockchainState.smartContract?.methods
          ?.whitelistedUsers(account)
          .call();
        const isWhitelisted = whitelistCount > 0;

        fetchWhitelisted(isWhitelisted);
      } catch (err) {
        console.log(err);
        fetchDataFailed("Could not load data from contract.");
      }
    },
    [blockchainState.smartContract?.methods]
  );

  const fetchData = useCallback(async () => {
    fetchDataRequest();
    try {
      const [
        totalSupply,
        locked,
        cost,
        maxSupply,
        maxMintAmount,
        currentSaleIndex,
      ] = await Promise.all([
        blockchainState?.smartContract?.methods.totalSupply().call(),
        blockchainState?.smartContract?.methods.locked().call(),
        blockchainState?.smartContract?.methods.cost().call(),
        blockchainState?.smartContract?.methods.maxSupply().call(),
        blockchainState?.smartContract?.methods.maxMintAmount().call(),
        blockchainState?.smartContract?.methods.currentSaleIndex().call(),
      ]);

      fetchDataSuccess({
        maxSupply: parseInt(maxSupply),
        totalSupply: parseInt(totalSupply),
        locked,
        cost: parseInt(cost),
        maxMintAmount: parseInt(maxMintAmount),
        currentSaleIndex: parseInt(currentSaleIndex),
      });
    } catch (err) {
      console.log(err);
      fetchDataFailed("Could not load data from contract.");
    }
  }, [blockchainState?.smartContract?.methods]);

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
