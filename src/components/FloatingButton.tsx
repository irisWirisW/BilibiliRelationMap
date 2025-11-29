import React from 'react'
import { Button } from 'antd'
import { RocketOutlined } from '@ant-design/icons'

interface FloatingButtonProps {
  onClick: () => void
}

const FloatingButton: React.FC<FloatingButtonProps> = ({ onClick }) => {
  return (
    <div className="floating-button-wrapper">
      <Button
        type="primary"
        shape="circle"
        size="large"
        icon={<RocketOutlined />}
        onClick={onClick}
      />
    </div>
  )
}

export default FloatingButton
