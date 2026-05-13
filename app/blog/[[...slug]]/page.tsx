// app/blog/[[...slug]]/page.tsx
import { OpinlyBlog } from "@opinly/next";
import { generateOpinlyMetadata } from "@opinly/next/utils/generate-metadata";
import { opinly } from "@/clients/opinly";
import { ResolvingMetadata } from "next";
import { OpinlyPagePropsPromisified } from "@opinly/backend";
import Link from "next/link";
import { BlogNav } from "@/components/blog/blog-nav";

export const revalidate = false;

const baseUrl = process.env.OPINLY_SITE_URL || "https://example.com";
const blogUrl = `${baseUrl}/blog`;

// Default SEO metadata for blog homepage
const defaultBlogMetadata = {
  title: "App Blog",
  description: "TODO: Blog description.",
  keywords: ["blog"],
};

export const generateMetadata = async (
  params: OpinlyPagePropsPromisified,
  parent: ResolvingMetadata
) => {
  // Check if this is the blog homepage (no slug) or a specific blog post
  const resolvedParams = await params.params;
  const slug = resolvedParams?.slug;
  const isHomepage =
    !slug || (Array.isArray(slug) && slug.length === 0) || slug === null;

  // For blog homepage, provide comprehensive SEO metadata
  if (isHomepage) {
    return {
      title: defaultBlogMetadata.title,
      description: defaultBlogMetadata.description,
      keywords: defaultBlogMetadata.keywords,
      authors: [{ name: "App" }],
      creator: "App",
      publisher: "App",
      alternates: {
        canonical: blogUrl,
      },
      openGraph: {
        title: defaultBlogMetadata.title,
        description: defaultBlogMetadata.description,
        url: blogUrl,
        siteName: "App",
        locale: "en_US",
        type: "website",
        images: [
          {
            url: `${baseUrl}/logos/android-chrome-512x512.png`,
            width: 512,
            height: 512,
            alt: "App Logo",
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: defaultBlogMetadata.title,
        description: defaultBlogMetadata.description,
        images: [`${baseUrl}/logos/android-chrome-512x512.png`],
        creator: "@app",
      },
      robots: {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          "max-video-preview": -1,
          "max-image-preview": "large",
          "max-snippet": -1,
        },
      },
      verification: {
        // Add your verification codes here if needed
        // google: "your-google-verification-code",
        // yandex: "your-yandex-verification-code",
      },
    };
  }

  // For individual blog posts, use Opinly's metadata generator
  try {
    return await generateOpinlyMetadata(opinly, params, parent);
  } catch (error) {
    console.error("Error generating metadata:", error);
    // Fallback to default metadata if Opinly fails
    return {
      title: defaultBlogMetadata.title,
      description: defaultBlogMetadata.description,
      openGraph: {
        title: defaultBlogMetadata.title,
        description: defaultBlogMetadata.description,
        url: blogUrl,
        siteName: "App",
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title: defaultBlogMetadata.title,
        description: defaultBlogMetadata.description,
      },
    };
  }
};

const HomePageHeading = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-16 flex flex-col justify-center items-center pt-8">
      <h1 className="text-5xl font-bold text-op-heading mb-6 w-fit h-14">
        App Blog
      </h1>
      <p className="text-xl text-op-body max-w-3xl mx-auto">
        TODO: Blog tagline.
      </p>
    </div>
  );
};

const HomePageCTA = () => {
  return (
    <div className="py-20 text-center">
      <h2 className="text-3xl font-bold text-op-heading mb-6">
        TODO: Blog CTA headline.
      </h2>
      <p className="text-lg text-op-body mb-8 max-w-2xl mx-auto">
        TODO: Blog CTA subheadline.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link
          href="/sign-up"
          className="inline-flex items-center justify-center px-8 py-4 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 transition-colors"
        >
          Get Started Free
        </Link>
        <Link
          href="/about"
          className="inline-flex items-center justify-center px-8 py-4 border-2 border-orange-500 text-orange-500 hover:text-white hover:bg-orange-500 font-bold rounded-lg transition-colors"
        >
          Learn More
        </Link>
      </div>
    </div>
  );
};

const BlogPostCTA = () => {
  return (
    <div className="py-20 text-center">
      <h2 className="text-3xl font-bold text-op-heading mb-6">
        TODO: Blog post CTA headline.
      </h2>
      <p className="text-lg text-op-body mb-8 max-w-2xl mx-auto">
        TODO: Blog post CTA subheadline.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link
          href="/sign-up"
          className="inline-flex items-center justify-center px-8 py-4 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 transition-colors"
        >
          Get Started Free
        </Link>
      </div>
    </div>
  );
};

export default async function BlogPostPage(props: OpinlyPagePropsPromisified) {
  try {
    return (
      <div className="min-h-screen bg-white">
        <BlogNav />
        <div className="pt-16">
          <OpinlyBlog
            client={opinly}
            pageData={props}
            homePageProps={{
              header: <HomePageHeading />,
              cta: <HomePageCTA />,
            }}
            blogPostProps={{
              cta: <BlogPostCTA />,
            }}
          />
        </div>
      </div>
    );
  } catch (error) {
    // Ensure error is a proper Error object for React Server Components
    const errorObj = error instanceof Error ? error : new Error(String(error));

    console.error("Error rendering blog:", errorObj);

    return (
      <div className="min-h-screen bg-white">
        <BlogNav />
        <div className="pt-24 flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Error loading blog</h1>
            <p className="text-gray-600">Please try again later.</p>
          </div>
        </div>
      </div>
    );
  }
}
