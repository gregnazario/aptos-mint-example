import {WalletSelector} from "@aptos-labs/wallet-adapter-ant-design";
import "@aptos-labs/wallet-adapter-ant-design/dist/index.css";
import {Button, Col, Form, Image, Input, Layout, Row} from "antd";
import {useWallet} from "@aptos-labs/wallet-adapter-react";
import {Fragment, useEffect, useState} from "react";
import {
    AccountAddress,
    Aptos,
    AptosConfig,
    GetOwnedTokensResponse,
    GetTokenDataResponse,
    Network, stringStructTag, TypeTagAddress, TypeTagStruct
} from "@aptos-labs/ts-sdk";

const COLLECTION_ADDRESS = "0x4e0e0c9dcc8bfe15ebfec6c47e178b394b75032b080344320766a7c989b50f0d";
const MODULE_ADDRESS = "0x828843ccd655dfc74474fcd0ea157300e46f5e35baeaf5f8f6737fdfa786728d";
const MODULE_NAME = "parallel_mint";
const MINT_FUNCTION = "mint"
const SET_TOKEN_URI_FUNCTION = "change_token_uri"

enum PageName {
    Mint = "Mint",
    Modify = "Modify",
    Wallet = "Wallet"
}

const aptos = new Aptos(new AptosConfig({network: Network.DEVNET}));

function App() {
    const wallet = useWallet();
    const [page, setPage] = useState<PageName>(PageName.Mint)
    const [walletNfts, setWalletNfts] = useState<GetOwnedTokensResponse>();
    const [token, setToken] = useState<AccountAddress | undefined>();
    const [tokenData, setTokenData] = useState<GetTokenDataResponse | undefined>(undefined);
    const [imageUrl, setImageUrl] = useState<string>("ipfs://bafybeibugs55qfvnjvegfs4txrlc3t3nfcjirie224tnsyhiaiusnjwcgi");

    async function mint() {
        let transactionHash: string = await wallet.signAndSubmitTransaction({
            data: {
                function: `${MODULE_ADDRESS}::${MODULE_NAME}::${MINT_FUNCTION}`,
                functionArguments: [],
                abi: {
                    parameters: [],
                    typeParameters: []
                }
            }
        })
        await waitForTransaction(transactionHash);
        await loadWallet();
        await loadNft()
    }

    async function changeImage() {
        let transactionHash: string = await wallet.signAndSubmitTransaction({
            data: {
                function: `${MODULE_ADDRESS}::${MODULE_NAME}::${SET_TOKEN_URI_FUNCTION}`,
                functionArguments: [tokenData?.token_data_id, imageUrl],
                abi: {
                    parameters: [new TypeTagAddress(), new TypeTagStruct(stringStructTag())],
                    typeParameters: []
                }
            }
        })
        await waitForTransaction(transactionHash);
    }

    async function loadNft() {
        const savedToken = token;
        if (savedToken === undefined) {
            setTokenData(undefined);
        } else {
            setTokenData(await aptos.digitalAsset.getDigitalAssetData({digitalAssetAddress: savedToken}));
        }
    }

    async function loadWallet() {
        const walletAddress = wallet.account?.address;
        if (!walletAddress) {
            setWalletNfts([]);
        } else {
            // TODO: order by / handle pagination
            const assets = await aptos.getOwnedDigitalAssets({ownerAddress: walletAddress});
            const filtered = assets.filter((item) => {
                return item.current_token_data?.current_collection?.collection_id === COLLECTION_ADDRESS
            });
            setWalletNfts(filtered);
        }
    }

    async function waitForTransaction(transactionHash: string) {
        // TODO: Set loading and unloading
        await aptos.waitForTransaction({transactionHash})
    }

    function convertImage(uri: string | undefined) {
        if (undefined) {
            return undefined;
        } else {
            if (uri?.startsWith("ipfs://")) {
                return <Image src={`https://cloudflare-ipfs.com/ipfs/${uri?.split("ipfs://")[1]}`}/>;
            } else {
                return <Image src={uri}/>;
            }
        }
    }

    function convert(): any[] {
        const output = [];
        if (walletNfts) {
            walletNfts.map((item) => {
                const image = convertImage(item.current_token_data?.token_uri);


                if (image) {
                    output.push(<Layout onClick={async () => {
                        setPage(PageName.Modify);
                        setToken(AccountAddress.from(item.current_token_data!.token_data_id));
                        await loadNft();
                    }}>
                        <Row>
                            <Col>{image}</Col>
                        </Row>
                        <Row>
                            <Col>
                                <p>{item.current_token_data?.token_name}</p>
                            </Col>
                        </Row>
                    </Layout>)
                }
            })
        }

        return output;
    }


    useEffect(() => {
        loadWallet().then()
    }, [wallet.account])

    return (
        <>
            <Row className={"navbar"}>
                <Col className="navbar-text">Mint Choose Your Own NFT</Col>
                <Col className="navbar-text" onClick={() => setPage(PageName.Mint)}> Mint </Col>
                <Col className="navbar-text" onClick={() => setPage(PageName.Wallet)}>Wallet</Col>
                <Col>
                    <WalletSelector/>
                </Col>
            </Row>
            {page === PageName.Mint &&
                <div className="center-container">
                    <img className="center-image"
                         src="https://bafybeibugs55qfvnjvegfs4txrlc3t3nfcjirie224tnsyhiaiusnjwcgi.ipfs.dweb.link/"
                         alt="aptos"/>
                    <Button onClick={mint}>
                        Mint NFT
                    </Button>
                </div>}
            {page === PageName.Modify &&
                <div className="center-container">
                    <Layout>
                        <Row>
                            <Col>
                                <center>Current Image</center>
                                {convertImage(tokenData?.token_uri)}
                            </Col>
                            <Col>
                                <center>New Image</center>
                                {convertImage(imageUrl)}
                            </Col>
                        </Row>
                        <Row>
                            <Col>
                                <Input onChange={(event) => {
                                    setImageUrl(event.target.value)
                                }}
                                       defaultValue={imageUrl}>
                                </Input>
                            </Col>
                            <Col>
                                <Button onClick={changeImage}>
                                    Modify NFT
                                </Button>
                            </Col>

                        </Row>
                    </Layout>
                </div>}
            {page === PageName.Wallet &&
                <div className="center-container">
                    {convert()}
                </div>}
        </>
    );
}

export default App;
