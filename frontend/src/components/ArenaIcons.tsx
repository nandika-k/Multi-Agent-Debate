import type { CSSProperties } from 'react'

import { Icons8Bell } from './Icons8Bell'
import { BoxingGloveIcon } from '@phosphor-icons/react/dist/csr/BoxingGlove'
import { BrainIcon } from '@phosphor-icons/react/dist/csr/Brain'
import { ChartBarIcon } from '@phosphor-icons/react/dist/csr/ChartBar'
import { CheckCircleIcon } from '@phosphor-icons/react/dist/csr/CheckCircle'
import { CircleIcon } from '@phosphor-icons/react/dist/csr/Circle'
import { ClipboardTextIcon } from '@phosphor-icons/react/dist/csr/ClipboardText'
import { CrownIcon } from '@phosphor-icons/react/dist/csr/Crown'
import { DotsThreeIcon } from '@phosphor-icons/react/dist/csr/DotsThree'
import { FlagCheckeredIcon } from '@phosphor-icons/react/dist/csr/FlagCheckered'
import { FlaskIcon } from '@phosphor-icons/react/dist/csr/Flask'
import { MedalIcon } from '@phosphor-icons/react/dist/csr/Medal'
import { NewspaperIcon } from '@phosphor-icons/react/dist/csr/Newspaper'
import { SwordIcon } from '@phosphor-icons/react/dist/csr/Sword'
import { TargetIcon } from '@phosphor-icons/react/dist/csr/Target'
import { TrophyIcon } from '@phosphor-icons/react/dist/csr/Trophy'

type IconProps = {
  size?: number
  className?: string
  style?: CSSProperties
  mirrored?: boolean
}

function baseProps({ size = 18, className, style, mirrored }: IconProps) {
  const transform = mirrored ? `${style?.transform ?? ''} scaleX(-1)`.trim() : style?.transform
  return {
    size,
    weight: 'fill' as const,
    className,
    style: transform ? { ...style, transform } : style,
  }
}

function imageStyle(style?: CSSProperties, mirrored?: boolean): CSSProperties {
  const transform = mirrored ? `${style?.transform ?? ''} scaleX(-1)`.trim() : style?.transform
  return {
    display: 'inline-block',
    objectFit: 'contain',
    verticalAlign: 'middle',
    ...(transform ? { ...style, transform } : style),
  }
}

export const ArenaBell = ({ size = 18, className, style }: IconProps) => (
  <Icons8Bell size={size} color={style?.color ?? '#F5A623'} className={className} />
)
export const ArenaScales = ({ size = 18, className, style, mirrored }: IconProps) => {
  return (
    <img
      src="/icons8-law-64.png"
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className={className}
      style={imageStyle(style, mirrored)}
    />
  )
}
export const ArenaLightning = ({ size = 18, className, style, mirrored }: IconProps) => (
  <img
    src="/icons8-lightning-48.png"
    alt=""
    aria-hidden="true"
    width={size}
    height={size}
    className={className}
    style={imageStyle(style, mirrored)}
  />
)
export const ArenaFire = ({ size = 18, className, style, mirrored }: IconProps) => (
  <img
    src="/icons8-fire-48.png"
    alt=""
    aria-hidden="true"
    width={size}
    height={size}
    className={className}
    style={imageStyle(style, mirrored)}
  />
)
export const ArenaBang = ({ size = 18, className, style, mirrored }: IconProps) => (
  <img
    src="/icons8-bang-48.png"
    alt=""
    aria-hidden="true"
    width={size}
    height={size}
    className={className}
    style={imageStyle(style, mirrored)}
  />
)
export const ArenaBoxingGlove = (props: IconProps) => <BoxingGloveIcon {...baseProps(props)} />
export const ArenaBrain = (props: IconProps) => <BrainIcon {...baseProps(props)} />
export const ArenaChartBar = (props: IconProps) => <ChartBarIcon {...baseProps(props)} />
export const ArenaCheckCircle = (props: IconProps) => <CheckCircleIcon {...baseProps(props)} />
export const ArenaCircle = (props: IconProps) => <CircleIcon {...baseProps(props)} />
export const ArenaClipboard = (props: IconProps) => <ClipboardTextIcon {...baseProps(props)} />
export const ArenaCrown = (props: IconProps) => <CrownIcon {...baseProps(props)} />
export const ArenaDotsThree = (props: IconProps) => <DotsThreeIcon {...baseProps(props)} />
export const ArenaFlag = (props: IconProps) => <FlagCheckeredIcon {...baseProps(props)} />
export const ArenaFlask = (props: IconProps) => <FlaskIcon {...baseProps(props)} />
export const ArenaMedal = (props: IconProps) => <MedalIcon {...baseProps(props)} />
export const ArenaNewspaper = (props: IconProps) => <NewspaperIcon {...baseProps(props)} />
export const ArenaSword = (props: IconProps) => <SwordIcon {...baseProps(props)} />
export const ArenaTarget = (props: IconProps) => <TargetIcon {...baseProps(props)} />
export const ArenaTrophy = (props: IconProps) => <TrophyIcon {...baseProps(props)} />
export const ArenaWarning = (props: IconProps) => <ArenaBang {...props} />
