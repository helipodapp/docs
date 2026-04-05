import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { baseOptions, linkItems } from '@/components/layouts/shared';
import {
  NavbarMenu,
  NavbarMenuContent,
  NavbarMenuLink,
  NavbarMenuTrigger,
} from 'fumadocs-ui/layouts/home/navbar';
import Link from 'fumadocs-core/link';
import Image from 'next/image';
import Preview from '@/public/banner.webp';
import { Book, ComponentIcon, Layers3, Pencil, PlusIcon, Rocket, Server, Wrench } from 'lucide-react';

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <HomeLayout
      {...baseOptions()}
      links={[
        {
          type: 'menu',
          on: 'menu',
          text: 'Documentation',
          items: [
            {
              text: 'Getting Started',
              url: '/',
              icon: <Book />,
            },
            {
              text: 'Components',
              url: '/ui/components',
              icon: <ComponentIcon />,
            },
            {
              text: 'Platform',
              url: '/platform',
              icon: <Layers3 />,
            },
            {
              text: 'Build & Deploy',
              url: '/build-deploy',
              icon: <Wrench />,
            },
            {
              text: 'Deployments',
              url: '/build-deploy/deployments',
              icon: <Rocket />,
            },
          ],
        },
        {
          type: 'custom',
          on: 'nav',
          children: (
            <NavbarMenu>
              <NavbarMenuTrigger>
                <Link href="/">Documentation</Link>
              </NavbarMenuTrigger>
              <NavbarMenuContent>
                <NavbarMenuLink href="/" className="md:row-span-2">
                  <div className="-mx-3 -mt-3">
                    <Image
                      src={Preview}
                      alt="Preview"
                      className="rounded-t-lg object-cover"
                      style={{
                        maskImage: 'linear-gradient(to bottom,white 60%,transparent)',
                      }}
                    />
                  </div>
                  <p className="font-medium">Getting Started</p>
                  <p className="text-fd-muted-foreground text-sm">
                    Learn to use Fumadocs on your docs site.
                  </p>
                </NavbarMenuLink>

                <NavbarMenuLink href="/ui/components" className="lg:col-start-2">
                  <ComponentIcon className="bg-fd-primary text-fd-primary-foreground p-1 mb-2 rounded-md" />
                  <p className="font-medium">Components</p>
                  <p className="text-fd-muted-foreground text-sm">
                    Add interactive experience to your docs.
                  </p>
                </NavbarMenuLink>

                <NavbarMenuLink href="/openapi" className="lg:col-start-2">
                  <Server className="bg-fd-primary text-fd-primary-foreground p-1 mb-2 rounded-md" />
                  <p className="font-medium">OpenAPI</p>
                  <p className="text-fd-muted-foreground text-sm">
                    Generate interactive playgrounds and docs for your OpenAPI schema.
                  </p>
                </NavbarMenuLink>

                <NavbarMenuLink href="/platform" className="lg:col-start-2">
                  <Layers3 className="bg-fd-primary text-fd-primary-foreground p-1 mb-2 rounded-md" />
                  <p className="font-medium">Platform</p>
                  <p className="text-fd-muted-foreground text-sm">
                    Understand Helipod architecture, workflows, and operational principles.
                  </p>
                </NavbarMenuLink>

                <NavbarMenuLink href="/build-deploy" className="lg:col-start-3">
                  <Wrench className="bg-fd-primary text-fd-primary-foreground p-1 mb-2 rounded-md" />
                  <p className="font-medium">Build &amp; Deploy</p>
                  <p className="text-fd-muted-foreground text-sm">
                    Configure services, build pipelines, and rollout behavior in Helipod.
                  </p>
                </NavbarMenuLink>

                <NavbarMenuLink href="/build-deploy/deployments" className="lg:col-start-3">
                  <Rocket className="bg-fd-primary text-fd-primary-foreground p-1 mb-2 rounded-md" />
                  <p className="font-medium">Deployments</p>
                  <p className="text-fd-muted-foreground text-sm">
                    Control release lifecycle, rollout safety, and deployment actions.
                  </p>
                </NavbarMenuLink>

                <NavbarMenuLink href="/markdown" className="lg:col-start-3 lg:row-start-1">
                  <Pencil className="bg-fd-primary text-fd-primary-foreground p-1 mb-2 rounded-md" />
                  <p className="font-medium">Markdown</p>
                  <p className="text-fd-muted-foreground text-sm">
                    Learn the writing format/syntax of Fumadocs.
                  </p>
                </NavbarMenuLink>

                <NavbarMenuLink
                  href="/manual-installation"
                  className="lg:col-start-3 lg:row-start-2"
                >
                  <PlusIcon className="bg-fd-primary text-fd-primary-foreground p-1 mb-2 rounded-md" />
                  <p className="font-medium">Manual Installation</p>
                  <p className="text-fd-muted-foreground text-sm">
                    Setup Fumadocs for your existing Next.js app.
                  </p>
                </NavbarMenuLink>
              </NavbarMenuContent>
            </NavbarMenu>
          ),
        },
        ...linkItems,
      ]}
      className="dark:bg-neutral-950 dark:[--color-fd-background:var(--color-neutral-950)] [--color-fd-primary:var(--color-brand)]"
    >
      {children}
    </HomeLayout>
  );
}
