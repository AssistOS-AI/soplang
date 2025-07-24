import {} from "../deps/clean.mjs";
let persistence = $$.loadPlugin("DefaultPersistence");

await persistence.configureTypes({
    NFT:{
        owner: "string",
        category: "string"
    }
});


await persistence.createGrouping("MyNFTs1", "NFT", "owner");
await persistence.createGrouping("MyNFTs2", "NFT", "category");

await persistence.createNFT({ owner: "Alice", category: "Art" });
await persistence.createNFT({ owner: "Bob", category: "Art" });
await persistence.createNFT({ owner: "Alice", category: "Collectibles" });
await persistence.createNFT({ owner: "Jon", category: "Collectibles" });

let allAliceNFTs = await persistence.getMyNFTs1ObjectsByOwner("Alice");
console.log("All Alice NFTs:", allAliceNFTs);
if (allAliceNFTs.length !== 2) {
    throw new Error("Expected 2 NFTs for Alice, got " + allAliceNFTs.length);
}
let allArtNFTs = await persistence.getMyNFTs2ObjectsByCategory("Art");
console.log("All Art NFTs:", allArtNFTs);
if (allArtNFTs.length !== 2) {
    throw new Error("Expected 2 NFTs in Art category, got " + allArtNFTs.length);
}


$$.endTest();