"use client";

import ProjectOverview from "@/components/project-overview";
import DocumentManager from "@/components/document-manager";

export default function Home() {
  return (
    <div className="flex justify-center items-start sm:pt-16 min-h-screen w-full dark:bg-neutral-900 px-4 md:px-0 py-4">
      <div className="flex flex-col items-center w-full max-w-[500px]">
        <ProjectOverview />
        <div className="w-full mt-4 mb-4">
          <DocumentManager />
        </div>
      </div>
    </div>
  );
}