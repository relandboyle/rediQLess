/**
 * @description This section of the SPA is the feature component.  It describes the key features of our product.
 */

import React from "react";
import Features from "../components/features";


 const FeaturesContainer = () => {

	return (
		<div className="items-center px-16">
			<h1 className="text-center mt-10 mb-10">Not just caching, it's RediQLess.</h1>
			<Features />
		</div>
	)
 }

 export default FeaturesContainer;