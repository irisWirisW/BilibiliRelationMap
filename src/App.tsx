import React, { useState } from "react";
import { ConfigProvider, theme, App as AntApp } from "antd";
import zhCN from "antd/locale/zh_CN";
import FloatingButton from "./components/FloatingButton";
import InfoModal from "./components/InfoModal";
import { AppProvider } from "./contexts/AppContext";
import { GraphDataProvider } from "./contexts/GraphDataContext";
import StorageMigrator from "./components/StorageMigrator";

const App: React.FC = () => {
  const [modalVisible, setModalVisible] = useState(false);

  const handleOpenModal = () => {
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
  };

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          zIndexPopupBase: 100000,
        },
      }}
    >
      <AntApp>
        <AppProvider>
          <GraphDataProvider>
            <StorageMigrator />
            <FloatingButton onClick={handleOpenModal} />
            <InfoModal visible={modalVisible} onClose={handleCloseModal} />
          </GraphDataProvider>
        </AppProvider>
      </AntApp>
    </ConfigProvider>
  );
};

export default App;
