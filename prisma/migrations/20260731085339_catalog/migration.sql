-- CreateEnum
CREATE TYPE "Unit" AS ENUM ('ML', 'CL', 'L', 'OZ', 'TSP', 'TBSP', 'CUP', 'SHOT', 'JIGGER', 'PART', 'DASH', 'SPLASH', 'DROP', 'PINCH', 'GRAM', 'CAN', 'BOTTLE', 'GLASS', 'SCOOP', 'PIECE');

-- CreateTable
CREATE TABLE "Cocktail" (
    "id" SERIAL NOT NULL,
    "externalId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "glass" TEXT,
    "iba" TEXT,
    "tags" TEXT[],
    "isAlcoholic" BOOLEAN NOT NULL DEFAULT true,
    "instructions" TEXT NOT NULL,
    "imageUrl" TEXT,
    "imageIsCC" BOOLEAN NOT NULL DEFAULT false,
    "imageAttribution" TEXT,
    "sourceModifiedAt" TIMESTAMP(3),

    CONSTRAINT "Cocktail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ingredient" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "groupSlug" TEXT,
    "isAlcoholic" BOOLEAN NOT NULL DEFAULT false,
    "abv" DOUBLE PRECISION,
    "abvEstimated" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "imageUrl" TEXT,

    CONSTRAINT "Ingredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CocktailIngredient" (
    "cocktailId" INTEGER NOT NULL,
    "ingredientId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION,
    "amountMax" DOUBLE PRECISION,
    "unit" "Unit",
    "amountMl" DOUBLE PRECISION,
    "rawMeasure" TEXT NOT NULL,
    "note" TEXT,
    "optional" BOOLEAN NOT NULL DEFAULT false,
    "garnish" BOOLEAN NOT NULL DEFAULT false,
    "toTaste" BOOLEAN NOT NULL DEFAULT false,
    "topUp" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CocktailIngredient_pkey" PRIMARY KEY ("cocktailId","position")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cocktail_externalId_key" ON "Cocktail"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Cocktail_slug_key" ON "Cocktail"("slug");

-- CreateIndex
CREATE INDEX "Cocktail_category_idx" ON "Cocktail"("category");

-- CreateIndex
CREATE INDEX "Cocktail_isAlcoholic_idx" ON "Cocktail"("isAlcoholic");

-- CreateIndex
CREATE UNIQUE INDEX "Ingredient_slug_key" ON "Ingredient"("slug");

-- CreateIndex
CREATE INDEX "Ingredient_groupSlug_idx" ON "Ingredient"("groupSlug");

-- CreateIndex
CREATE INDEX "Ingredient_isAlcoholic_idx" ON "Ingredient"("isAlcoholic");

-- CreateIndex
CREATE INDEX "CocktailIngredient_ingredientId_idx" ON "CocktailIngredient"("ingredientId");

-- AddForeignKey
ALTER TABLE "CocktailIngredient" ADD CONSTRAINT "CocktailIngredient_cocktailId_fkey" FOREIGN KEY ("cocktailId") REFERENCES "Cocktail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CocktailIngredient" ADD CONSTRAINT "CocktailIngredient_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
