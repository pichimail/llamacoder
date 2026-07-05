"use client"

import { assetFeature } from "@/components/hooks/use-asset"
import { captionsFeature } from "@/components/hooks/use-captions"
import { mediaFeature } from "@/components/hooks/use-media"
import { pictureInPictureFeature } from "@/components/hooks/use-picture-in-picture"
import { playbackFeature } from "@/components/hooks/use-playback"
import { playbackRateFeature } from "@/components/hooks/use-playback-rate"
import { playerFeature } from "@/components/hooks/use-player"
import { playlistFeature } from "@/components/hooks/use-playlist"
import { timelineFeature } from "@/components/hooks/use-timeline"
import { volumeFeature } from "@/components/hooks/use-volume"
import { createMediaKit } from "@/components/ui/media-provider"

export const media = createMediaKit({
  features: [
    mediaFeature(),
    playerFeature(),
    playbackFeature(),
    playlistFeature(),
    volumeFeature(),
    timelineFeature(),
    captionsFeature(),
    playbackRateFeature(),
    pictureInPictureFeature(),
    assetFeature(),
  ] as const,
})

export const MediaProvider = media.MediaProvider
export const useMediaEvents = media.useMediaEvents
