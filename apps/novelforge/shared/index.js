// Shared types for NovelForge
// Time period presets for UI selection
export var TIME_PERIOD_PRESETS = [
    {
        type: 'past',
        label: '500 Years Ago',
        description: 'A distant past with medieval or renaissance elements',
        yearOffset: -500,
        emoji: "\uD83C\uDFF0" // castle emoji
    },
    {
        type: 'present',
        label: 'Modern Day',
        description: 'Contemporary setting with current technology and culture',
        yearOffset: 0,
        emoji: "\uD83D\uDCF1" // mobile phone emoji
    },
    {
        type: 'future',
        label: '500 Years Ahead',
        description: 'A future with advanced technology and transformed society',
        yearOffset: 500,
        emoji: "\uD83D\uDE80" // rocket emoji
    },
    {
        type: 'unknown',
        label: 'Unknown/Distant',
        description: 'An unspecified or impossibly distant time period',
        emoji: "\u2728" // sparkles emoji
    },
    {
        type: 'custom',
        label: 'Custom Year',
        description: 'Specify an exact year for your story',
        emoji: "\uD83D\uDCC5" // calendar emoji
    },
];
