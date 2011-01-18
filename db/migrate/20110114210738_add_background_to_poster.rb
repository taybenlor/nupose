class AddBackgroundToPoster < ActiveRecord::Migration
  def self.up
    add_column :posters, :background_image, :string
    add_column :posters, :background_colour_top, :string
    add_column :posters, :background_colour_bottom, :string
  end

  def self.down
    remove_column :posters, :background_image
    remove_column :posters, :background_colour_top
    remove_column :posters, :background_colour_bottom
  end
end
