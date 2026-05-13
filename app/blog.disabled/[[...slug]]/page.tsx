// app/blog/[[...slug]]/page.tsx
import { OpinlyBlog } from "@opinly/next";
import { generateOpinlyMetadata } from "@opinly/next/utils/generate-metadata";
import { opinly } from "@/clients/opinly";
import { ResolvingMetadata } from "next";
import { OpinlyPagePropsPromisified } from "@opinly/backend";
import Link from "next/link";

export const revalidate = false;

export const generateMetadata = async (
  params: OpinlyPagePropsPromisified,
  parent: ResolvingMetadata
) => {
  try {
    return await generateOpinlyMetadata(opinly, params, parent);
  } catch (error) {
    console.error("Error generating metadata:", error);
    return {
      title: "App Blog",
      description:
        "Insights, tips, and strategies for turning customer feedback into product improvements",
    };
  }
};

const HomePageHeading = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-16 flex flex-col justify-center items-center">
      <h1 className="text-5xl font-bold text-op-heading mb-6 w-fit h-14">
        App Blog
      </h1>
      <p className="text-xl text-op-body max-w-3xl mx-auto">
        Insights, tips, and strategies for turning customer feedback into
        product improvements
      </p>
    </div>
  );
};

const HomePageCTA = () => {
  return (
    <div className="py-20 text-center">
      <h2 className="text-3xl font-bold text-op-heading mb-6">
        Ready to transform your feedback process?
      </h2>
      <p className="text-lg text-op-body mb-8 max-w-2xl mx-auto">
        Start collecting and organizing customer feedback today. No credit card
        required.
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
        Turn feedback into action
      </h2>
      <p className="text-lg text-op-body mb-8 max-w-2xl mx-auto">
        Start using App to transform customer feedback into actionable
        tasks.
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
      <OpinlyBlog
        client={opinly}
        pageData={props}
        homePageProps={{
          // This will appear at the top of the home page
          header: <HomePageHeading />,
          // This will appear after the recent posts but above folders
          cta: <HomePageCTA />,
        }}
        blogPostProps={{
          // This will appear under the table of contents on the blog post page
          cta: <BlogPostCTA />,
        }}
      />
    );
  } catch (error) {
    console.error("Error rendering blog:", error);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Error loading blog</h1>
          <p className="text-gray-600">Please try again later.</p>
        </div>
      </div>
    );
  }
}
