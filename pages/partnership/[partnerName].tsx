import Box from '@mui/material/Box';
import { GetStaticPathsContext, GetStaticPropsContext, NextPage } from 'next';
import { useTranslations } from 'next-intl';
import Head from 'next/head';
import { StoriesParams, StoryblokComponent, StoryData } from 'storyblok-js-client';
import PartnerHeader from '../../components/layout/PartnerHeader';
import StoryblokPageSection from '../../components/storyblok/StoryblokPageSection';
import Storyblok, { useStoryblok } from '../../config/storyblok';
import { LANGUAGES } from '../../constants/enums';
import { getPartnerContent, PartnerContent } from '../../constants/partners';
import illustrationBloomHeadYellow from '../../public/illustration_bloom_head_yellow.svg';
import welcomeToBloom from '../../public/welcome_to_bloom.svg';

interface Props {
  story: StoryData;
  preview: boolean;
  sbParams: StoriesParams;
  locale: LANGUAGES;
}

// TODO pull out
type StoryBlokData = StoryData<
  StoryblokComponent<string> & {
    [index: string]: any;
  }
>;

const Partnership: NextPage<Props> = ({ story, preview, sbParams, locale }) => {
  const partnerName = story.slug;
  const configuredStory = useStoryblok(story, preview, sbParams, locale);

  const t = useTranslations('Partnership');
  const tS = useTranslations('Shared');

  return showPartnershipView(configuredStory, getPartnerContent(partnerName));
};
//
const showPartnershipView = (story: StoryBlokData, partnerContent: PartnerContent) => {
  return (
    <Box>
      <Head>
        <title>{story.content.title}</title>
      </Head>
      <PartnerHeader
        partnerLogoSrc={partnerContent.partnershipLogo || welcomeToBloom}
        partnerLogoAlt={partnerContent.partnershipLogoAlt || 'alt.welcomeToBloom'}
        imageSrc={partnerContent.bloomGirlIllustration || illustrationBloomHeadYellow}
        imageAlt={'alt.bloomHead'}
      />
      {story.content.page_sections?.length > 0 &&
        story.content.page_sections.map((section: any, index: number) => (
          <StoryblokPageSection
            key={`page_section_${index}`}
            content={section.content}
            alignment={section.alignment}
            color={section.color}
          />
        ))}
    </Box>
  );
};

export async function getStaticProps({ locale, preview = false, params }: GetStaticPropsContext) {
  const partnerName = params?.partnerName;

  const sbParams = {
    version: preview ? 'draft' : 'published',
    cv: preview ? Date.now() : 0,
    language: locale,
  };

  let { data } = await Storyblok.get(`cdn/stories/partnership/${partnerName}`, sbParams);

  return {
    props: {
      story: data ? data.story : null,
      preview,
      messages: {
        ...require(`../../messages/shared/${locale}.json`),
        ...require(`../../messages/navigation/${locale}.json`),
        ...require(`../../messages/partnership/${locale}.json`),
      },
      locale,
    },
    revalidate: 3600, // revalidate every hour
  };
}

export async function getStaticPaths({ locales }: GetStaticPathsContext) {
  let { data } = await Storyblok.get('cdn/links/?starts_with=partnership/');

  let paths: any = [];
  Object.keys(data.links).forEach((linkKey) => {
    // get array for slug because of catch all
    const slug = data.links[linkKey].slug;
    let splittedSlug = slug.split('/');

    if (locales) {
      // create additional languages
      for (const locale of locales) {
        paths.push({ params: { partnerName: splittedSlug[1] }, locale });
      }
    }
  });

  return {
    paths,
    fallback: false,
  };
}

export default Partnership;
