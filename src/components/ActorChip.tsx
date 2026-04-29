import Link from 'next/link';
import Image from 'next/image';
import type { Actor } from '@/lib/types';

interface Props {
  actor: Actor;
  characterName?: string | null;
}

export function ActorChip({ actor, characterName }: Props) {
  return (
    <Link
      href={`/movies/actor/${actor.actor_id}`}
      className="flex w-32 flex-shrink-0 flex-col items-center rounded-md bg-surface p-2 text-center hover:ring-1 hover:ring-accent/40"
    >
      <div className="relative h-16 w-16 overflow-hidden rounded-full bg-zinc-800">
        {actor.profile_image_url && (
          <Image
            src={actor.profile_image_url}
            alt={actor.actor_name}
            fill
            sizes="64px"
            className="object-cover"
          />
        )}
      </div>
      <div className="mt-2 text-xs font-medium text-zinc-100 line-clamp-2">
        {actor.actor_name}
      </div>
      {characterName && (
        <div className="mt-0.5 text-[10px] text-zinc-400 line-clamp-1">
          as {characterName}
        </div>
      )}
    </Link>
  );
}
