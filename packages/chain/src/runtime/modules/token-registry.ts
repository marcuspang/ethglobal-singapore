import { TokenId, UInt64 } from "@proto-kit/library";
import { RuntimeModule, runtimeModule, state } from "@proto-kit/module";
import { State, StateMap } from "@proto-kit/protocol";
import { Field } from "o1js";

export class TokenIdId extends Field {}

interface TokenRegistryConfig {
  maxTokens: UInt64;
}

/**
 * Maintains an incremental registry of all the token IDs in circulation.
 *
 * @author kaupangdx https://github.com/kaupangdx/kaupangdx-new
 * @author marcuspang https://github.com/marcuspang/ethglobal-singapore
 */
@runtimeModule()
export class TokenRegistry extends RuntimeModule<TokenRegistryConfig> {
  @state() public tokenIdToTokenIdId = StateMap.from<TokenId, TokenIdId>(
    TokenId,
    TokenIdId
  );
  // TODO: improve registry logic
  @state() public tokenIdIdToTokenId = StateMap.from<TokenIdId, TokenId>(
    TokenIdId,
    TokenId
  );
  @state() public lastTokenIdId = State.from(TokenIdId);

  public async addTokenId(tokenId: TokenId) {
    const lastTokenIdId = (await this.lastTokenIdId.get()).value;
    const nextTokenIdId = lastTokenIdId.add(1);
    await this.lastTokenIdId.set(nextTokenIdId);
    await this.tokenIdToTokenIdId.set(tokenId, nextTokenIdId);
    await this.tokenIdIdToTokenId.set(nextTokenIdId, tokenId);
  }
}
