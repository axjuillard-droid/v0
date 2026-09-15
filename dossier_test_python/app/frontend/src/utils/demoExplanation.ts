import { ExplanationData } from '../components/common/DemoExplanationModal';

export const triggerDemoExplanation = (data: ExplanationData) => {
  window.dispatchEvent(
    new CustomEvent('open-demo-explanation', { detail: data })
  );
};

/**
  * Si le mode Démo est actif, affiche l'explication et exécute l'action uniquement après confirmation de l'utilisateur.
  * Si le mode Démo est inactif, exécute l'action immédiatement.
  */
export const executeWithDemoExplanation = (
  isDemoMode: boolean | undefined,
  explanation: ExplanationData,
  action: () => void
) => {
  if (isDemoMode) {
    triggerDemoExplanation({
      ...explanation,
      onConfirm: action,
    });
  } else {
    action();
  }
};
