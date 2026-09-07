import { PageHeroEditor } from '@/components/admin/page-hero-editor';
import { VideoHubEditor } from '@/components/admin/video-hub-editor';

export default function GalleryPageContentPage() {
  return <PageHeroEditor page="gallery" extra={<VideoHubEditor />} />;
}
