import { Redirect } from '@docusaurus/router';
import useBaseUrl from '@docusaurus/useBaseUrl';

/**
 * Docs are served at the site root, but the entry point is `/intro`
 * (which is what backupdata.io links to). Send bare `/` there.
 */
export default function Home(): React.ReactElement {
  return <Redirect to={useBaseUrl('/intro')} />;
}
