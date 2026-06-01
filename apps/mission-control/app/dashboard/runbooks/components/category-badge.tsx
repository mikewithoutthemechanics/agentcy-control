import { Badge } from '@agentcy/ui';

export function getCategoryBadge(category: string) {
  switch (category) {
    case 'incident-response':
      return <Badge variant="error">Incident Response</Badge>;
    case 'deployment':
      return <Badge variant="info">Deployment</Badge>;
    case 'security':
      return <Badge variant="warning">Security</Badge>;
    case 'maintenance':
      return <Badge variant="default">Maintenance</Badge>;
    case 'onboarding':
      return <Badge variant="success">Onboarding</Badge>;
    default:
      return <Badge variant="default">Custom</Badge>;
  }
}
