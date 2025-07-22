export interface Divergence {
    index: number;
    existingRevisionHash: string | null;
    upcomingRevisionHash: string | null;
}

export interface RevisionsComparisonResult {
    divergences: Divergence[];
    mergedArray: string[];
    identical: boolean;
    sameLength: boolean;
    existingRevisionsLength: number;
    upcomingRevisionsLength: number;
    lastIdenticalRevisionHash: string | null;
}

// const comparisonResult: RevisionsComparisonResult = {
//     divergences: [
//         {
//             index: 6,
//             existingRevisionHash: null,
//             upcomingRevisionHash: 'e7719544c0ff396e3edc1dda2b784d44f03ceb73410a471f5b37091f5e43be19d0cb654045906ef6b361b499a771d88f56067acb4afa6c0949c384c421f8e51e'
//         }
//     ],
//     mergedArray: [
//         'e3839fff23f468300b65a9be15a452aa160c1ccbe91d657d2d73767100711bb0e97f29fb7949de6aced5a73d1278e6227b8b20225050025fd6af6b8cb6ebb25f',
//         'd32a796eb95848ffc2efbc83466e94d838218d4733d41b4f15ce134d443cea4b05b7395674a6d9926b60056cf776e34ea292302a5885606fb1064d5ff5014ad1',
//         '2a3d96625db20c3a64b884a41a90af24716e177365647b25163fefd71b85cb285543b0450b1faf8edf93dff69de5d71adc4ee8adf999eb4c4ad3cec7d61973f0',
//         '20a2a9ba0178a4a8d8d4f251440e71ac1d8f958c518b5eb6d7be020d58d04ef9640cb69c2e65d33efc736df976024b3663a3684f0bd4b85674fa80c5944b65c4',
//         '911c4d27936f6641213a6368541662fdb57ef600c09a7e574be3beb00b56449dcf698e5385af80ac6abbf4b2a5ff0f38c75bdf3ceda6556dbadf3fe4a0341cef',
//         '4ebd035c34329a227e4962c4b16ff77db0c380c6e8a1de232df5b1fd956165c826e36180d799039274bac3db8c5be5f583ac04acb38abc29e9f51c2efb4bf8a0',
//         'e7719544c0ff396e3edc1dda2b784d44f03ceb73410a471f5b37091f5e43be19d0cb654045906ef6b361b499a771d88f56067acb4afa6c0949c384c421f8e51e'
//     ],
//     identical: false,
//     sameLength: false,
//     existingRevisionsLength: 7,
//     upcomingRevisionsLength: 6
// };
