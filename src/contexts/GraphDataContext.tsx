import React, { createContext, useContext, useState } from "react";
import { FansItem } from "../types/bilibili";

interface GraphDataContextType {
    followingsList: FansItem[];
    commonFollowingsMap: Map<number, number[]>;
    dataLoaded: boolean;
    setFollowingsList: (list: FansItem[]) => void;
    setCommonFollowingsMap: (map: Map<number, number[]>) => void;
    setDataLoaded: (loaded: boolean) => void;
}

const GraphDataContext = createContext<GraphDataContextType | undefined>(
    undefined,
);

export const GraphDataProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [followingsList, setFollowingsList] = useState<FansItem[]>([]);
    const [commonFollowingsMap, setCommonFollowingsMap] = useState<
        Map<number, number[]>
    >(new Map());
    const [dataLoaded, setDataLoaded] = useState(false);

    return (
        <GraphDataContext.Provider
            value={{
                followingsList,
                commonFollowingsMap,
                dataLoaded,
                setFollowingsList,
                setCommonFollowingsMap,
                setDataLoaded,
            }}
        >
            {children}
        </GraphDataContext.Provider>
    );
};

export const useGraphDataContext = () => {
    const context = useContext(GraphDataContext);
    if (!context) {
        throw new Error(
            "useGraphDataContext must be used within GraphDataProvider",
        );
    }
    return context;
};
