import { Modal } from 'react-native';
import { PaywallScreen } from '../../src/screens/PaywallScreen';

interface Props {
  visible: boolean;
  onClose: () => void;
}

/**
 * Thin wrapper — presents PaywallScreen inside a slide-up modal sheet.
 * All callers (stats, settings, sounds, timer) use this component unchanged.
 */
export function PaywallModal({ visible, onClose }: Props) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <PaywallScreen onClose={onClose} />
    </Modal>
  );
}
